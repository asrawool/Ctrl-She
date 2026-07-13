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
    const { question } = await req.json();
    if (!question) {
      return new Response(JSON.stringify({ error: "Missing question parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiApiKey) {
      return new Response(JSON.stringify({ error: "Missing OpenAI API Key secret" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Generate 768-dimension query embedding
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: question,
        dimensions: 768,
      }),
    });

    if (!embeddingResponse.ok) {
      const errText = await embeddingResponse.text();
      throw new Error(`OpenAI Embedding API failed: ${errText}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // 2. Perform similarity search in Postgres
    const { data: chunks, error: matchError } = await supabase.rpc("match_document_chunks", {
      query_embedding: queryEmbedding,
      match_count: 5,
    });

    if (matchError) {
      throw new Error(`match_document_chunks RPC failed: ${matchError.message}`);
    }

    // 3. Resolve document details for matching chunks
    const docIds = [...new Set((chunks || []).map((c: any) => c.document_id))];
    let docs: any[] = [];
    if (docIds.length > 0) {
      const { data } = await supabase
        .from("documents")
        .select("id, name, category, asset, version")
        .in("id", docIds);
      docs = data || [];
    }

    // 4. Construct LLM context and system prompt
    const context = (chunks || []).map((c: any, index: number) => {
      const doc = docs.find((d: any) => d.id === c.document_id);
      return `[Source ${index + 1}]:
Document ID: ${c.document_id}
Document Title: ${doc?.name || "Unknown Document"}
Category: ${doc?.category || "Unknown"}
Asset/Equipment: ${doc?.asset || "Unknown"}
Content: ${c.content}`;
    }).join("\n\n");

    const systemPrompt = `You are IntelliPlant AI, an expert industrial plant engineering copilot.
You have access to the official plant documentation, manuals, SOPs, and incident reports.

Use the provided source document excerpts as your context. Answer the user's question with high accuracy, detail, and technical precision.
Follow these constraints strictly:
1. Cite specific document titles (e.g. "DocScanner 3-2-24.pdf") and sections when presenting diagnostics or recommendations.
2. Provide step-by-step or structured answers where relevant, specifying equipment IDs (e.g. Pump P-401, Boiler B-12), numeric tolerances, calibration thresholds, and standard SOP procedures.
3. Avoid generic, one-line, or hand-wavy answers. If the query implies a diagnostic or procedural request, provide a comprehensive technical response citing appropriate steps.
4. If the retrieved documents do not contain the answer, explain honestly that you cannot find the details in the indexed manuals, but offer general engineering guidelines if helpful. Always clarify the distinction.

Here is the retrieved context:
${context}`;

    // 5. Call OpenAI Chat completion
    const chatResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        temperature: 0.1,
      }),
    });

    if (!chatResponse.ok) {
      const errText = await chatResponse.text();
      throw new Error(`OpenAI Chat API failed: ${errText}`);
    }

    const chatData = await chatResponse.json();
    const answer = chatData.choices[0].message.content;

    // 6. Format sources to return to client
    const sources = (chunks || []).map((c: any) => {
      const doc = docs.find((d: any) => d.id === c.document_id);
      return {
        documentId: c.document_id,
        documentName: doc?.name || "Unknown Document",
        similarity: typeof c.similarity === "number" ? c.similarity : 0.85,
        page: c.chunk_index + 1,
      };
    });

    return new Response(JSON.stringify({ answer, sources }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("ask-copilot error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
