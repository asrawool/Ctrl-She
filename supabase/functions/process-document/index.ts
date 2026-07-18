import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "Missing documentId parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("Missing GEMINI_API_KEY secret.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch document record
    const { data: doc, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (fetchError || !doc) {
      throw new Error(`Document not found: ${fetchError?.message}`);
    }

    // Update status to processing
    await supabase
      .from("documents")
      .update({ status: "processing", error_message: null })
      .eq("id", documentId);

    console.log(`Processing document: ${doc.name} (${doc.id})`);

    // 2. Download file from storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("documents")
      .download(doc.storage_path);

    if (downloadError || !fileBlob) {
      throw new Error(`Storage download failed: ${downloadError?.message}`);
    }

    // 3. Extract text content
    let textContent = "";
    const ext = doc.name.split(".").pop()?.toLowerCase();

    if (ext === "txt" || ext === "csv" || ext === "json") {
      textContent = await fileBlob.text();
    } else {
      // PDF, DOCX, XLSX, Image: use Gemini multimodal API to extract text
      const buffer = await fileBlob.arrayBuffer();
      const binary = new Uint8Array(buffer);
      let binaryString = "";
      for (let i = 0; i < binary.length; i++) {
        binaryString += String.fromCharCode(binary[i]);
      }
      const base64 = btoa(binaryString);

      let mimeType = "application/pdf";
      if (ext === "xlsx" || ext === "xls") {
        mimeType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      } else if (ext === "docx" || ext === "doc") {
        mimeType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      } else if (ext === "png") {
        mimeType = "image/png";
      } else if (ext === "jpg" || ext === "jpeg") {
        mimeType = "image/jpeg";
      } else if (ext === "webp") {
        mimeType = "image/webp";
      }

      console.log(
        `Sending file to Gemini flash for text extraction (${mimeType})...`,
      );
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: "Extract all readable text, checklists, data columns, procedures, and tables from this document. Do not summarize; extract the complete content exactly and cleanly.",
                  },
                  {
                    inlineData: {
                      mimeType,
                      data: base64,
                    },
                  },
                ],
              },
            ],
            generationConfig: { temperature: 0.1 },
          }),
        },
      );

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        textContent =
          geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else {
        const errText = await geminiResponse.text();
        throw new Error(`Gemini text extraction failed: ${errText}`);
      }
    }

    if (!textContent.trim()) {
      throw new Error("No text content could be extracted from the document.");
    }

    console.log(`Extracted text length: ${textContent.length} characters.`);

    // 4. Clean up any existing chunks for this document
    await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", documentId);

    // 5. Chunk text (~1000 characters with 150 overlap)
    const chunks: string[] = [];
    const chunkSize = 1000;
    const overlap = 150;

    let index = 0;
    while (index < textContent.length) {
      const chunk = textContent.substring(index, index + chunkSize);
      if (chunk.trim()) {
        chunks.push(chunk);
      }
      index += chunkSize - overlap;
    }

    console.log(`Splitting document into ${chunks.length} chunks...`);

    // 6. Generate embeddings and save chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      console.log(
        `Generating embedding for chunk ${i + 1}/${chunks.length}...`,
      );

      const embeddingResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text: chunkText }] },
          }),
        },
      );

      if (!embeddingResponse.ok) {
        const errText = await embeddingResponse.text();
        throw new Error(`Gemini embedding failed for chunk ${i}: ${errText}`);
      }

      const embeddingData = await embeddingResponse.json();
      const embeddingValues = embeddingData.embedding?.values;

      if (!embeddingValues) {
        throw new Error(`No embedding values returned for chunk ${i}`);
      }

      const { error: insertError } = await supabase
        .from("document_chunks")
        .insert({
          document_id: documentId,
          content: chunkText,
          chunk_index: i,
          embedding: embeddingValues,
          metadata: {
            category: doc.category,
            asset: doc.asset,
            version: doc.version,
          },
        });

      if (insertError) {
        throw new Error(`Failed to save chunk ${i}: ${insertError.message}`);
      }
    }

    // 7. Update document status to ready
    await supabase
      .from("documents")
      .update({ status: "ready", error_message: null })
      .eq("id", documentId);

    console.log(`Successfully completed indexing for document: ${doc.name}`);

    return new Response(
      JSON.stringify({ success: true, chunksCount: chunks.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const error = err as Error;
    console.error("process-document error:", error.message);

    // Try to update document status to error in DB if documentId exists
    try {
      const body = await req
        .clone()
        .json()
        .catch(() => ({}));
      if (body.documentId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from("documents")
          .update({ status: "error", error_message: error.message })
          .eq("id", body.documentId);
      }
    } catch (dbErr) {
      console.error("Failed to log error to DB:", (dbErr as Error).message);
    }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
