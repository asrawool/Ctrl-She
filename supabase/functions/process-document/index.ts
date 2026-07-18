import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DOCUMENTS_BUCKET = "copilot-attachments";

function detectMimeType(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function extractPrintableText(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  let current = "";

  for (let i = 0; i < bytes.length; i++) {
    const code = bytes[i];
    const isPrintable = code >= 32 && code <= 126;
    const isWhitespace = code === 9 || code === 10 || code === 13;

    if (isPrintable || isWhitespace) {
      current += String.fromCharCode(code);
      continue;
    }

    if (current.trim().length >= 4) {
      chunks.push(current.trim());
    }
    current = "";
  }

  if (current.trim().length >= 4) {
    chunks.push(current.trim());
  }

  return chunks.slice(0, 200).join("\n");
}

async function tryGeminiExtraction(
  fileBlob: Blob,
  mimeType: string,
  prompt: string,
  geminiApiKey: string,
) {
  const buffer = await fileBlob.arrayBuffer();
  const binary = new Uint8Array(buffer);
  let binaryString = "";
  for (let i = 0; i < binary.length; i++) {
    binaryString += String.fromCharCode(binary[i]);
  }
  const base64 = btoa(binaryString);

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
                text: prompt,
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

  if (!geminiResponse.ok) {
    const errText = await geminiResponse.text();
    throw new Error(`Gemini text extraction failed: ${errText}`);
  }

  const geminiData = await geminiResponse.json();
  return geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

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
      .from(DOCUMENTS_BUCKET)
      .download(doc.storage_path);

    if (downloadError || !fileBlob) {
      throw new Error(`Storage download failed: ${downloadError?.message}`);
    }

    // 3. Extract text content
    let textContent = "";
    const ext = doc.name.split(".").pop()?.toLowerCase();
    const mimeType = detectMimeType(doc.name);

    if (ext === "txt" || ext === "csv" || ext === "json") {
      textContent = await fileBlob.text();
    } else {
      try {
        textContent = await tryGeminiExtraction(
          fileBlob,
          mimeType,
          "Extract all readable text, checklists, data columns, procedures, tables, annotations, dimensions, tags, title block text, callouts, and notes from this document. Do not summarize; extract the complete content exactly and cleanly.",
          geminiApiKey,
        );
      } catch (geminiErr) {
        console.warn(
          "Gemini OCR/extraction failed, using printable text fallback:",
          (geminiErr as Error).message,
        );
        const buffer = await fileBlob.arrayBuffer();
        textContent = extractPrintableText(buffer);
      }
      if (!textContent.trim()) {
        textContent = `File metadata: ${doc.name}. Category: ${doc.category || "uncategorized"}. Asset: ${doc.asset || "unknown"}. Version: ${doc.version || "unknown"}.`;
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
