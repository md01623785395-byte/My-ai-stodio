# AI Creator Studio — Project Requirements & Architecture

## 1. Executive Vision & Core Business Goal

**Primary Objective:**
The user inputs a single topic, commercial theme, market opportunity, or asks the AI Assistant for **50–100 distinct prompts**. The system then orchestrates and tracks the complete end-to-end content-business lifecycle with minimal manual effort:
1. **Prompt Planning & Expansion** (50–100 distinct, commercially viable prompts)
2. **Supported Image & Video Generation** (automated batch execution across available providers)
3. **Unified Asset Tracking** (from prompt conception to revenue realization)
4. **Visual Quality Checks** (automated canvas & computer vision inspection)
5. **Duplicate & Near-Duplicate Detection** (perceptual similarity hashing to prevent marketplace rejections)
6. **Image-Grounded Metadata** (factual titles, descriptions, and strictly verified keywords based on actual pixel content)
7. **Marketplace-Specific Compliance** (Adobe Stock, Shutterstock, Freepik, Dreamstime rule engines)
8. **AI Disclosure Enforcement** (mandatory disclosure flags, metadata tagging, property release checks)
9. **Technical File Preparation** (format conversion, 2x/4x upscaling, minimum megapixel thresholds, IPTC/CSV packaging)
10. **Submission Tracking** (auditable submission records, platform-by-platform status tracking)
11. **Sales & Performance Reporting** (authentic sales intake, verified transaction records)
12. **Revenue Tracking & Commercial Analytics** (niche ROI, portfolio yield, royalty tracking)

---

## 2. Core Operating Principles: Truthfulness, Safety & Automation Boundaries

1. **Strict Truthfulness & Verification:**
   - **Never claim an upload occurred** unless verified via an authorized, authenticated marketplace API or confirmed by user receipt.
   - **Never claim an approval, rejection, sale, or payment occurred** without authenticated programmatic confirmation or verified creator import.
   - UI status indicators must clearly differentiate between `Ready for Submission (Local Export)` vs `Submitted (User Confirmed)` vs `Live on Marketplace (Verified)`.

2. **Supported Automation Only:**
   - Automate every step that is technically supported, authorized, and locally executable (batch prompt planning, generation scheduling, pixel analysis, quality inspection, metadata derivation, export generation).
   - For steps requiring third-party marketplace actions where public contributor upload APIs are restricted or non-existent (e.g. Adobe Stock web contributor portal, Shutterstock contributor UI), provide one-click packaged files, standardized CSV exports, and structured submission checklists.

3. **Mandatory Human-in-the-Loop Review for High-Risk Cases:**
   - Require explicit user confirmation when:
     - Quality check score is marginal (e.g., sharpness or noise near rejection thresholds).
     - Potential brand, trademark, or copyrighted likeness is suspected.
     - Ambiguous human/facial features are detected that could trigger model release rejections.
     - Perceptual similarity between two assets in a batch exceeds 85% (duplicate risk).

4. **Data & Workflow Preservation:**
   - Never break, alter, or discard existing assets, user settings, or functional workflows.
   - All enhancements must build on top of existing local storage, server proxies, and tested utilities.

---

## 3. The 12-Stage Content-Business Architecture

### Stage 1: Batch Prompt Planning & Expansion (50–100 Prompts)
- **Capability:** Generates 50–100 distinct, non-repetitive commercial prompts from a single topic or creative brief.
- **Diversity Dimensions:** Varies camera angles, lighting conditions (golden hour, studio high-key, cinematic low-key, diffused softbox), compositions (flat lay, extreme close-up, wide environmental, macro), seasonal contexts, and commercial use-cases.
- **Commercial Filter:** Enforces "commercial stock suitability" (clean negative space for copy, isolated subjects, authentic lifestyle concepts, avoids forbidden trademarks or proprietary hardware logos).
- **Prompt Planner Output:** Structured prompt batch items with unique identifiers, target media type (image or video), recommended aspect ratio, intended stock niche, and commercial concept notes.

### Stage 2: Supported Image & Video Generation
- **Execution Engine:** Batch generation queue with concurrency management, retry policies, and fallback mechanics (e.g., Gemini Imagen models, MiniMax, server-side fallbacks).
- **Progressive Processing:** Asynchronous job processing allowing the user to monitor live progress (e.g., "Generated 14/50 assets").
- **Asset Instantiation:** Automatically converts generated outputs into first-class `Asset` records linked to the originating prompt batch.

### Stage 3: Asset Tracking & Pipeline Lifecycle State Machine
- **Lifecycle States:**
  - `PLANNED` (Prompt crafted and staged in batch)
  - `GENERATING` (Actively being rendered by AI model)
  - `GENERATED` (Render complete; awaiting inspection)
  - `QUALITY_CHECKED` (Passed technical visual inspection)
  - `METADATA_PREPARED` (Vision-grounded titles, descriptions, and keywords generated)
  - `EXPORTED` (Upscaled/packaged with sidecar/CSV)
  - `SUBMITTED` (Tracked submission record created with date and batch ID)
  - `APPROVED` / `REJECTED` (Marketplace status verified)
  - `MONETIZED` (Sales recorded against asset ID)
- **Traceability:** Every asset tracks its full pedigree: seed topic, prompt ID, model provider, resolution history, quality score, metadata version, and submission history.

### Stage 4: Automated Visual Quality Inspection
- **Technical Canvas Metrics:**
  - High-frequency edge sharpness detection (Laplacian variance calculation).
  - High-ISO noise and grain estimation.
  - Dynamic range and clipping analysis (shadow/highlight loss).
  - Minimum pixel dimension validation (e.g. 4MP minimum for Adobe Stock, 12MP+ optimal).
- **Visual Artifact & Anomaly Detection:**
  - AI gibberish text / pseudo-signage detection.
  - Unnatural anatomy and edge warps.
  - Overall quality scoring (Pass / Marginal / Fail).

### Stage 5: Perceptual Duplicate & Near-Duplicate Detection
- **Purpose:** Prevents marketplace account penalties caused by flooding stock agencies with nearly identical AI variations ("spamming similar assets").
- **Mechanism:** Perceptual hashing (dHash/pHash) computed from scaled grayscale image buffers.
- **Thresholding:**
  - Hamming distance < 5 (Similarity > 90%): Flagged as direct duplicate; prompt regeneration or variation pruning required.
  - Hamming distance 5–12 (Similarity 75%–90%): Flagged as near-duplicate variant; flagged for manual review.
  - Hamming distance > 12: Distinct asset; cleared for submission.

### Stage 6: Image-Grounded Metadata Generation
- **Pixel-Based Grounding:** Visual analysis operates on actual generated image pixels (via Gemini Vision API), verifying visible objects, colors, textures, lighting, setting, and composition.
- **Anti-Hallucination Filtering:** Strict removal of elements mentioned in prompts that did not render in the final image (e.g., if "wooden table" was in the prompt but the background rendered as plain white studio, "wood" and "cutting board" are stripped from keywords).
- **Natural Title Formulation:** Syntactically complete, natural English titles truncated only at natural prepositional/clause boundaries, avoiding hanging connectors or trailing fragments.

### Stage 7: Marketplace-Specific Compliance Engine
- **Adobe Stock:**
  - Title: 5–70 characters (including mandatory `" Generative AI"` suffix).
  - Keywords: 20–50 natural, grounded keywords ordered by commercial importance. No brand names, camera specs, or quality superlatives.
  - Format: High-resolution JPEG, minimum 4MP.
- **Shutterstock:**
  - Title: 5–200 characters, descriptive, factual.
  - Keywords: Up to 50 keywords.
  - Category tags: 1–2 primary category classifications.
- **Freepik:**
  - Strict generative AI labeling.
  - Clean isolated composition focus.
- **Dreamstime:**
  - Commercial relevance, minimum 3MP, specific editorial vs commercial classification.

### Stage 8: AI Disclosure & Regulatory Compliance
- **Metadata Flagging:** Automated tagging with standard EXIF/IPTC tags (e.g., `DigitalCreationType: "trainedAlgorithmicMedia"`).
- **Marketplace Declarations:** Automatic generation of mandatory marketplace disclosure strings and checkbox guidance for contributor portals.
- **Property & Release Declarations:** Automated property release notes when recognizable architectural or private property designs are simulated.

### Stage 9: File Preparation & Packaging
- **Upscaling Engine:** Canvas-based 2x and 4x upscaling ensuring assets exceed marketplace resolution requirements (12MP–24MP targets).
- **Format Normalization:** High-quality JPEG conversion (0.92–0.95 quality factor) optimized for file size limits and color fidelity.
- **Export Bundler:** Batch export generating:
  - Standardized marketplace CSVs (Adobe Stock CSV, Shutterstock CSV, Freepik CSV).
  - Structured JSON metadata dossiers.
  - High-res processed JPEG files named systematically with asset IDs.

### Stage 10: Submission Tracking & Workflow Ledger
- **Submission Batches:** Groups assets into named submission batches with timestamp, target marketplace, and item counts.
- **Verification Protocols:**
  - Status is set to `Exported & Packaged` upon file download.
  - User confirms upload date and contributor batch ID, transitioning status to `Submitted (Pending Review)`.
  - Never automatically claim an asset is uploaded or approved without external verification.

### Stage 11: Sales & Performance Reporting
- **Data Ingestion:**
  - Standard CSV/TSV sales report import from Adobe Stock Contributor, Shutterstock, and Freepik contributor consoles.
  - Manual transaction entry for individual sales/downloads.
- **Zero Synthetic Claims:** System strictly displays actual recorded numbers; no simulated downloads, earnings, or payments are presented as real facts.

### Stage 12: Revenue Tracking & Commercial Analytics
- **Portfolio Economics:**
  - Total earnings, revenue per asset, revenue per niche.
  - Conversion rates (approved assets vs submitted assets).
  - Download frequency and high-yield keyword attribution.
- **Actionable Optimization:** AI Assistant reviews sales data to recommend high-yield niches for the next 50–100 prompt batch.

---

## 4. Current Codebase Implementation Status & Gap Analysis

| Workflow Stage | Current Status in Codebase | Existing Implementation Assets | Missing Capabilities / Required Work |
| :--- | :---: | :--- | :--- |
| **1. Prompt Planning (50–100 prompts)** | **Partial** | `ChatGPTAssistantView.tsx` supports single prompt generation and quick prompts. `MarketingAIView.tsx` provides single concept generation. | **Missing:** Dedicated Batch Prompt Planner engine capable of generating 50–100 distinct prompts at once, organized by niche, diversity matrix, and ready for 1-click batch queuing. |
| **2. Batch Image/Video Generation** | **Partial** | `CreateImageView.tsx` and `CreateVideoView.tsx` generate 1 asset at a time via `/api/generate-image` and `/api/generate-video`. | **Missing:** Batch Generation Queue manager that sequentially or concurrently executes 50–100 prompt jobs with live progress, retry logic, and auto-ingest into Assets. |
| **3. Asset Tracking State Machine** | **Partial** | Assets have basic metadata (`id`, `title`, `type`, `url`, `createdAt`, `isFavorite`). | **Missing:** Formal pipeline stage enum (`planned`, `queued`, `quality_checked`, `metadata_prepared`, `exported`, `submitted`, `approved`, `monetized`) and batch ID relations. |
| **4. Visual Quality Inspection** | **Fully Implemented** | `qualityChecker.ts` calculates real canvas sharpness, noise, contrast, clipping, and dimensions. `FinalQualityCheckCard.tsx` renders reports. | **Enhancement needed:** Automated batch quality filtering (auto-pass high scores, flag low scores) without opening individual modals. |
| **5. Duplicate Detection** | **Missing** | None currently implemented. | **Missing:** Perceptual hash algorithm (dHash) to compare assets within a batch and alert the creator to near-identical duplicate outputs. |
| **6. Image-Grounded Metadata** | **Fully Implemented** | `/api/stock/prepare-metadata` with Gemini 3.8 Flash visual pixel analysis, `filterAndGroundKeywords`, natural title boundaries. | **Ready for reuse:** Already tested and verified on real image pixels; needs batch execution support. |
| **7. Marketplace Compliance** | **Fully Implemented** | `stockMetadataValidator.ts` enforces Adobe Stock, Shutterstock, Freepik, and Dreamstime rules. | **Ready for reuse:** Tested and verified. |
| **8. AI Disclosure** | **Fully Implemented** | `aiDisclosure` field, `" Generative AI"` title suffixing, and official marketplace policy notes in `stockMetadataValidator.ts`. | **Ready for reuse:** Fully aligned with 2026 guidelines. |
| **9. File Preparation & Packaging** | **Fully Implemented** | `imageEnhancer.ts` provides 2x/4x canvas upscale and JPEG conversion. `stockMetadataExporter.ts` exports Adobe/Shutterstock CSVs and JSON. | **Enhancement needed:** 1-click batch export (bulk ZIP or multi-file package download). |
| **10. Submission Tracking Ledger** | **Missing** | No submission batch records or submission status ledger. | **Missing:** Submission Manager tab or view tracking submission date, marketplace, batch number, and review status. |
| **11. Sales & Performance Reporting** | **Missing** | Dashboard displays static mock metrics (`revenue: $12,850`, etc.) in `mockAssets.ts`. | **Missing:** Genuine Sales Report importer (CSV from Adobe/Shutterstock contributor portals) and verified ledger. |
| **12. Revenue & ROI Analytics** | **Partial** | UI charts exist on `DashboardView.tsx`, but bind to static demo data. | **Missing:** Dynamic aggregation connecting verified sales entries to actual tracked assets and generation costs. |

---

## 5. Technical Implementation Roadmap

### Phase 1: Planning & Architecture Foundation (Current Phase)
- Formalize updated Project Requirements and Gap Analysis (`PROJECT_REQUIREMENTS.md`).
- Define unified pipeline data structures in `src/types/index.ts` (Batch Planner types, Pipeline statuses, Submission records, Verified Sales records).

### Phase 2: Batch Prompt Planner & Manager (50–100 Prompts)
- Implement AI Batch Prompt Planner in the Assistant / Studio engine:
  - Generates 50 to 100 commercially diverse prompts from a single topic input.
  - Ensures conceptual diversity across lighting, composition, negative space, and subject angles.
  - Allows bulk review, inline editing, and "Send to Batch Queue".

### Phase 3: Batch Queue & Pipeline Automation
- Implement background-friendly batch generation queue with status monitoring.
- Implement perceptual duplicate detection (dHash) to flag redundant generations.
- Integrate automated post-generation pipeline:
  - Auto-run Canvas Quality Inspection.
  - Auto-trigger Vision Pixel Analysis for Grounded Metadata.
  - Auto-validate marketplace compliance rules.

### Phase 4: Submission Ledger & Batch Packaging
- Provide 1-click batch packaging: bulk JPEG exports alongside marketplace CSVs (Adobe Stock CSV, Shutterstock CSV, Freepik CSV).
- Implement Submission Ledger to track submission batches, submission dates, and manual confirmation workflows.

### Phase 5: Verified Sales Reporting & Business Intelligence
- Implement Contributor CSV Sales Report Parser (Adobe Stock, Shutterstock earnings files).
- Compute real portfolio ROI, download velocity, and top-earning prompt niches.
- Connect sales insights back to the AI Assistant for intelligent next-batch planning.
