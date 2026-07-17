/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Chunk {
  id: string;
  document_id: string;
  content: string;
  similarity: number;
  chunk_index: number;
}

interface Doc {
  id: string;
  name: string;
  category?: string;
  asset?: string;
  version?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { question, attachments, history } = await req.json();
    if (!question) {
      return new Response(
        JSON.stringify({ error: "Missing question parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const groqApiKey = Deno.env.get("GROQ_API_KEY");

    if (!geminiApiKey && !groqApiKey) {
      throw new Error("Missing both GEMINI_API_KEY and GROQ_API_KEY secrets.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch live operational database context
    let liveStateContext = "";
    try {
      const [
        { data: assets },
        { data: workOrders },
        { data: ncrs },
        { data: spareParts },
        { data: policies },
        { data: inventory },
        { data: rcaReports },
        { data: complianceFrameworks },
        { data: inspections },
        { data: machineLicenses },
        { data: certifications },
      ] = await Promise.all([
        supabase.from("assets").select("*").limit(30),
        supabase.from("work_orders").select("*").limit(30),
        supabase.from("ncrs").select("*").limit(30),
        supabase.from("spare_parts").select("*").limit(30),
        supabase.from("insurance_policies").select("*").limit(30),
        supabase.from("inventory_items").select("*").limit(30),
        supabase.from("rca_reports").select("*").limit(30),
        supabase.from("compliance_frameworks").select("*").limit(30),
        supabase.from("inspections").select("*").limit(30),
        supabase.from("machine_licenses").select("*").limit(30),
        supabase.from("certifications").select("*").limit(30),
      ]);

      liveStateContext = `
=== LIVE OPERATIONAL STATE ===
[ASSETS HEALTH & STATUS]:
${assets && assets.length > 0 ? assets.map((a) => `- Asset ${a.id}: ${a.name} in ${a.plant}. Health: ${a.health_percentage}%, Status: ${a.status}, RUL: ${a.rul_days} days.`).join("\n") : "No assets data in database."}

[ACTIVE WORK ORDERS]:
${workOrders && workOrders.length > 0 ? workOrders.map((w) => `- WO ${w.id}: "${w.title}" for Asset ${w.asset_id}. Priority: ${w.priority}, Status: ${w.status}, Assigned to: ${w.assigned_to || "Unassigned"}.`).join("\n") : "No active work orders."}

[QUALITY & NON-CONFORMANCE REPORTS (NCRs)]:
${ncrs && ncrs.length > 0 ? ncrs.map((n) => `- NCR ${n.ncr_number}: "${n.description}" [Severity: ${n.severity}, Status: ${n.status}].`).join("\n") : "No non-conformance reports."}

[SPARE PARTS INVENTORY]:
${spareParts && spareParts.length > 0 ? spareParts.map((s) => `- Spare Part ${s.id}: ${s.name}. Qty: ${s.current_quantity} (Min Required: ${s.min_quantity}).`).join("\n") : "No spare parts data."}

[INSURANCE POLICIES]:
${policies && policies.length > 0 ? policies.map((p) => `- Policy ${p.id} for machine ${p.machine} (Asset: ${p.asset_id || "None"}). Provider: ${p.provider}, Expiry: ${p.expiry_date}, Coverage: ${p.coverage}, Status: ${p.status}.`).join("\n") : "No insurance policies."}

[INVENTORY ITEMS]:
${inventory && inventory.length > 0 ? inventory.map((i) => `- Item ${i.item_code} (${i.name}). Current Qty: ${i.current_qty} (Min: ${i.min_qty}, Max: ${i.max_qty}, Reorder Point: ${i.reorder_point}), Supplier: ${i.supplier}, Status: ${i.status}.`).join("\n") : "No inventory items."}

[ROOT CAUSE ANALYSIS (RCA) REPORTS]:
${rcaReports && rcaReports.length > 0 ? rcaReports.map((r) => `- RCA ${r.id} for Asset ${r.asset_id || "None"} (Incident Ref: ${r.incident_ref}). Symptoms: ${r.symptoms}. Cause: ${r.root_cause}. Corrective Action: ${r.corrective_actions}.`).join("\n") : "No RCA reports."}

[COMPLIANCE FRAMEWORKS]:
${complianceFrameworks && complianceFrameworks.length > 0 ? complianceFrameworks.map((f) => `- Framework ${f.id}: ${f.name}. Score: ${f.current_score}%.`).join("\n") : "No compliance frameworks."}

[INSPECTIONS SCHEDULING]:
${inspections && inspections.length > 0 ? inspections.map((i) => `- Inspection ${i.id}: "${i.name}" for Framework ${i.framework}. Scheduled: ${i.scheduled_date}, Status: ${i.status}, Assigned to: ${i.assigned_to || "Unassigned"}.`).join("\n") : "No inspections."}

[MACHINE LICENSES]:
${machineLicenses && machineLicenses.length > 0 ? machineLicenses.map((l) => `- License ${l.id}: ${l.kind} (No: ${l.cert_no}). Department: ${l.department}, Expiry: ${l.expiry_date}, Status: ${l.status}.`).join("\n") : "No machine licenses."}

[COMPLIANCE CERTIFICATIONS]:
${certifications && certifications.length > 0 ? certifications.map((c) => `- Cert ${c.id}: "${c.name}" (${c.category}). Issuer: ${c.issuer}, Expiry: ${c.expiry_date}, Version: ${c.version}, Status: ${c.status}.`).join("\n") : "No certifications."}
`;
    } catch (e) {
      const error = e as Error;
      console.error("Error fetching live operational data:", error.message);
      liveStateContext =
        "\n=== LIVE OPERATIONAL STATE ===\n(Live operational data currently unavailable)\n";
    }

    // 2. Generate 768-dimension query embedding using Gemini
    let queryEmbedding = null;
    let chunks: Chunk[] = [];
    let docs: Doc[] = [];

    if (geminiApiKey) {
      try {
        const embeddingResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "models/text-embedding-004",
              content: { parts: [{ text: question }] },
            }),
          },
        );

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          queryEmbedding = embeddingData.embedding?.values;
        } else {
          console.error(
            "Gemini embedding request failed:",
            await embeddingResponse.text(),
          );
        }
      } catch (err) {
        console.error("Failed to generate embedding with Gemini:", err);
      }
    }

    // 3. Perform similarity search in Postgres if embedding generated
    if (queryEmbedding) {
      const { data: dbChunks, error: matchError } = await supabase.rpc(
        "match_document_chunks",
        {
          query_embedding: queryEmbedding,
          match_count: 5,
        },
      );

      if (!matchError && dbChunks) {
        chunks = dbChunks;
        const docIds = [...new Set(chunks.map((c) => c.document_id))];
        if (docIds.length > 0) {
          const { data } = await supabase
            .from("documents")
            .select("id, name, category, asset, version")
            .in("id", docIds);
          docs = data || [];
        }
      } else if (matchError) {
        console.error("match_document_chunks failed:", matchError.message);
      }
    }

    // 4. Construct LLM context and system prompt
    const documentContext = chunks
      .map((c, index: number) => {
        const doc = docs.find((d) => d.id === c.document_id);
        return `[Source ${index + 1}]:
Document ID: ${c.document_id}
Document Title: ${doc?.name || "Unknown Document"}
Category: ${doc?.category || "Unknown"}
Asset/Equipment: ${doc?.asset || "Unknown"}
Content: ${c.content}`;
      })
      .join("\n\n");

    const systemPrompt = `You are IntelliPlant AI, an expert industrial plant engineering copilot.
You have access to the official plant documentation, manuals, SOPs, and incident reports (from document chunks), as well as the current real-time database state of assets, active work orders, NCRs, insurance, and inventory levels.

Use the provided live database state and document context to answer the user's question with high accuracy, detail, and technical precision.
Always prefer real data from the database if they ask about current asset health, inventory count, open work orders, certifications, or insurance policies. If they ask about procedures, safety manuals, or past incidents, rely on the document chunks.

Follow these constraints strictly:
1. Cite specific document titles (e.g. "DocScanner 3-2-24.pdf") and sections when presenting diagnostics or recommendations from documents.
2. Refer to specific equipment IDs (e.g. Pump P-401, Boiler B-12), priority levels, status, compliance scores, and stock levels when discussing operational data.
3. Be helpful, exact, and avoid generic answers.
4. Support minor typos or informal phrasing gracefully by matching to the closest logical database tags or entities.

Here is the retrieved document context:
${documentContext || "No matching document excerpts found."}

Here is the live operational state of the plant:
${liveStateContext}`;

    // 5. Detect image attachments for vision
    const imageAttachments = (attachments || []).filter(
      (a: any) =>
        a.type?.startsWith("image/") ||
        a.name.match(/\.(png|jpe?g|gif|webp)$/i),
    );
    const hasImages = imageAttachments.length > 0;

    let answer = "";

    // 6. Invoke LLM (Gemini as primary, Groq as fallback)
    if (geminiApiKey) {
      console.log("Routing request to Gemini...");
      const contents: any[] = [];

      // History
      for (const h of history || []) {
        const role = h.role === "user" ? "user" : "model";
        contents.push({
          role,
          parts: [{ text: h.content }],
        });
      }

      // User content parts
      const currentParts: any[] = [{ text: question }];
      if (hasImages) {
        for (const img of imageAttachments) {
          try {
            const imgRes = await fetch(img.path);
            const imgBlob = await imgRes.blob();
            const buffer = await imgBlob.arrayBuffer();
            // standard base64 in Deno/Javascript
            const binary = new Uint8Array(buffer);
            let binaryString = "";
            for (let i = 0; i < binary.length; i++) {
              binaryString += String.fromCharCode(binary[i]);
            }
            const base64 = btoa(binaryString);
            currentParts.push({
              inlineData: {
                mimeType: img.type || "image/jpeg",
                data: base64,
              },
            });
          } catch (e) {
            console.error(
              "Failed to download attachment for Gemini vision:",
              e,
            );
          }
        }
      }

      contents.push({ role: "user", parts: currentParts });

      const modelName = hasImages ? "gemini-1.5-flash" : "gemini-1.5-pro";
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { temperature: 0.1 },
          }),
        },
      );

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        answer = geminiData.candidates[0].content.parts[0].text;
      } else {
        const errText = await geminiResponse.text();
        console.error("Gemini API request failed:", errText);
        throw new Error(`Gemini API failed: ${errText}`);
      }
    } else if (groqApiKey) {
      console.log("Routing request to Groq (fallback)...");
      const messages: any[] = [];
      messages.push({ role: "system", content: systemPrompt });

      // Add conversation history
      for (const h of history || []) {
        const role =
          h.role === "assistant" || h.role === "ai" || h.role === "model"
            ? "assistant"
            : "user";
        messages.push({ role, content: h.content });
      }

      // Add user message
      if (hasImages) {
        const contentArray: any[] = [{ type: "text", text: question }];
        for (const img of imageAttachments) {
          contentArray.push({
            type: "image_url",
            image_url: { url: img.path },
          });
        }
        messages.push({ role: "user", content: contentArray });
      } else {
        messages.push({ role: "user", content: question });
      }

      const model = hasImages
        ? "llama-3.2-11b-vision-preview"
        : "llama-3.3-70b-versatile";

      const groqResponse = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.1,
          }),
        },
      );

      if (groqResponse.ok) {
        const groqData = await groqResponse.json();
        answer = groqData.choices[0].message.content;
      } else {
        const errText = await groqResponse.text();
        console.error("Groq API request failed:", errText);
        throw new Error(`Groq API failed: ${errText}`);
      }
    } else {
      throw new Error("Neither GEMINI_API_KEY nor GROQ_API_KEY is configured.");
    }

    // 7. Format sources to return to client
    const sources = chunks.map((c) => {
      const doc = docs.find((d) => d.id === c.document_id);
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
  } catch (err) {
    const error = err as Error;
    console.error("ask-copilot error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
