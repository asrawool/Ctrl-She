import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function classifyDocument(
  fileName: string,
  textContent: string,
  openRouterApiKey?: string,
  geminiApiKey?: string,
): Promise<string> {
  const allowedCategories = [
    "Technical Manuals",
    "Standard Operating Procedures (SOPs)",
    "Engineering Drawings",
    "Maintenance Records",
    "Inspection Reports",
    "Audit & Compliance",
    "Incident & Root Cause Reports",
    "Training & Safety",
    "Process & Operational Data",
    "Policies & Standards",
    "Best Practices & Lessons Learned",
  ];

  const systemInstructions = `You are an AI document classifier for an industrial plant.
Classify the given document into EXACTLY one of the following categories:
${allowedCategories.map((c) => `- ${c}`).join("\n")}

Use the following guidelines for classification:
- Technical Manuals: Equipment Manuals, OEM Manuals, User Manuals, Installation Manuals, Operation Manuals, Maintenance Manuals, Vendor Documentation, Product Datasheets, Technical Specifications, Calibration Manuals.
- Standard Operating Procedures (SOPs): Standard Operating Procedures, Work Instructions, Startup Procedures, Shutdown Procedures, Emergency Procedures, Lockout/Tagout (LOTO) Procedures, Operating Checklists, Cleaning Procedures, Inspection Procedures.
- Engineering Drawings: P&ID, PFD, Electrical Schematics, Single Line Diagrams, Instrument Loop Diagrams, Mechanical Drawings, CAD Drawings, General Arrangement (GA) Drawings, Isometric Drawings, Plant Layouts.
- Maintenance Records: Preventive/Corrective Maintenance Reports, Breakdown Reports, Repair Reports, Work Orders, Service Reports, Maintenance Logs, Equipment History, Spare Parts Records, Lubrication Records, Calibration Records, Maintenance Schedules.
- Inspection Reports: Equipment/Visual/Safety/Quality Inspection Reports, Condition Monitoring Reports, Vibration Analysis Reports, Thermography Reports, Ultrasonic Inspection Reports, Pressure Test Reports, NDT Reports.
- Audit & Compliance: Internal/External/ISO Audit Reports, Compliance Reports, CAPA Reports, Regulatory Inspection Reports, Environmental Compliance Reports, Safety Compliance Reports, Certification Documents.
- Incident & Root Cause Reports: Incident Reports, Accident Reports, Near Miss Reports, RCA, Failure Investigation Reports, Failure Analysis, Hazard Reports, Corrective/Preventive Action Reports.
- Training & Safety: Safety Manuals, Training Manuals, Training Presentations, PPE Guidelines, Toolbox Talks, Emergency Response Plans, SDS/MSDS, Safety Bulletins, Competency Records.
- Process & Operational Data: Excel Sheets, CSV Files, Production Logs, Shift Reports, Daily Reports, Sensor Data, PLC Logs, SCADA Exports, Historian Data, Process Parameters, KPI Reports.
- Policies & Standards: Company Policies, Engineering Standards, ISO Standards, Industry Standards, Government Regulations, Internal Guidelines, Standard Specifications, Design Standards.
- Best Practices & Lessons Learned: Best Practice Documents, Lessons Learned, Case Studies, Engineering Notes, Technical Bulletins, Optimization Reports, Improvement Initiatives, Knowledge Articles.

Respond with EXACTLY one of the allowed categories. Do not include quotes, markdown formatting, explanations, or any other characters.`;

  const userPrompt = `Document Filename: ${fileName}
Document Text Preview (first 2500 characters):
${textContent.substring(0, 2500)}`;

  let classificationResult = "";

  // 1. Try OpenRouter Primary Path
  if (openRouterApiKey) {
    try {
      console.log("Routing classification to OpenRouter...");
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterApiKey}`,
          "HTTP-Referer": "http://localhost:8082",
          "X-Title": "IntelliPlant Classifier",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct:free",
          messages: [
            { role: "system", content: systemInstructions },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.choices?.[0]?.message?.content) {
          classificationResult = data.choices[0].message.content.trim();
          console.log(
            `OpenRouter classification result: "${classificationResult}"`,
          );
        }
      }
    } catch (err) {
      console.error("OpenRouter classification failed:", err.message);
    }
  }

  // 2. Fallback to Gemini
  if (!classificationResult && geminiApiKey) {
    try {
      console.log("Routing classification to Gemini (fallback)...");
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemInstructions}\n\n${userPrompt}` }],
              },
            ],
            generationConfig: { temperature: 0.1 },
          }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          classificationResult = text.trim();
          console.log(
            `Gemini classification result: "${classificationResult}"`,
          );
        }
      }
    } catch (err) {
      console.error("Gemini classification failed:", err.message);
    }
  }

  if (classificationResult) {
    let cleaned = classificationResult.replace(/[`*_\n]/g, "").trim();
    if (cleaned.endsWith(".")) {
      cleaned = cleaned.slice(0, -1).trim();
    }
    const matched = allowedCategories.find(
      (c) => c.toLowerCase() === cleaned.toLowerCase(),
    );
    if (matched) {
      return matched;
    }
  }

  return "Uncategorized";

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

    // Auto-classification step if needed
    if (doc.category === "Auto Detect" || !doc.category) {
      console.log(
        "Auto-detection selected or category missing. Classifying...",
      );
      const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
      const detectedCategory = await classifyDocument(
        doc.name,
        textContent,
        openRouterApiKey,
        geminiApiKey,
      );
      console.log(`Detected category: ${detectedCategory}`);

      const currentTags = Array.isArray(doc.tags) ? doc.tags : [];
      const updatedTags = currentTags.includes("Auto-detected")
        ? currentTags
        : [...currentTags, "Auto-detected"];

      const { error: updateCatErr } = await supabase
        .from("documents")
        .update({
          category: detectedCategory,
          tags: updatedTags,
        })
        .eq("id", documentId);

      if (updateCatErr) {
        console.error(
          "Failed to update classified category in DB:",
          updateCatErr.message,
        );
      } else {
        doc.category = detectedCategory;
        doc.tags = updatedTags;
      }
    }

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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/gemini-embedding-2",
            content: { parts: [{ text: chunkText }] },
            outputDimensionality: 768,
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
