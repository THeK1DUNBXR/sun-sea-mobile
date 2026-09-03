/**
 * Cheque OCR — reads the key fields off a cheque photo so the agent only has
 * to confirm instead of type. Uses Claude vision with a strict JSON schema.
 *
 * Requires ANTHROPIC_API_KEY. Optional: MOBILE_OCR_MODEL (default claude-opus-5).
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { ApiError } from "../../utils/ApiError";

export const chequeFieldsSchema = z.object({
  bankName: z.string().nullable().describe("Bank name printed on the cheque, e.g. 'State Bank of India'"),
  branch: z.string().nullable().describe("Branch name/address line if printed"),
  ifsc: z.string().nullable().describe("11-character IFSC code if printed"),
  chequeNumber: z.string().nullable().describe("6-digit cheque number from the MICR band or top-right"),
  accountNumber: z.string().nullable().describe("Drawer's account number if printed"),
  date: z
    .string()
    .nullable()
    .describe("Cheque date normalised to YYYY-MM-DD (the DDMMYYYY boxes at the top right)"),
  amount: z.number().nullable().describe("Amount in figures as a plain number without currency or commas"),
  amountInWords: z.string().nullable().describe("Amount in words as written"),
  drawerName: z.string().nullable().describe("Name of the account holder / signatory (drawer)"),
  payeeName: z.string().nullable().describe("The 'Pay' line — who the cheque is written to"),
  isPostDated: z.boolean().nullable().describe("true if the cheque date is after today"),
  confidence: z.enum(["high", "medium", "low"]).describe("Overall confidence in the extracted fields"),
  warnings: z
    .array(z.string())
    .describe("Anything the agent should double-check: blurred digits, amount words/figures mismatch, missing signature, etc."),
});
export type ChequeFields = z.infer<typeof chequeFieldsSchema>;

const SUPPORTED_MEDIA = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageMediaType = (typeof SUPPORTED_MEDIA)[number];

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ApiError(503, "Cheque OCR is not configured (ANTHROPIC_API_KEY missing) — enter the details manually");
  }
  if (!client) client = new Anthropic();
  return client;
}

export async function readCheque(image: Buffer, mimeType: string, todayIso: string): Promise<ChequeFields> {
  if (!SUPPORTED_MEDIA.includes(mimeType as ImageMediaType)) {
    throw new ApiError(400, "Cheque OCR accepts JPG, PNG or WEBP images");
  }
  const anthropic = getClient();
  const model = process.env.MOBILE_OCR_MODEL || "claude-opus-5";

  const response = await anthropic.messages.parse({
    model,
    max_tokens: 2048,
    system:
      "You read Indian bank cheques for a field-collection app. Extract only what is legibly printed or handwritten on the cheque. " +
      "Never guess a digit: if a field is unreadable return null and add a warning. " +
      `Today's date is ${todayIso}; use it to decide isPostDated. Dates on Indian cheques are written DD MM YYYY.`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mimeType as ImageMediaType, data: image.toString("base64") },
          },
          { type: "text", text: "Extract the cheque details." },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(chequeFieldsSchema) },
  });

  if (response.stop_reason === "refusal") {
    throw new ApiError(422, "The image could not be processed — please enter the cheque details manually");
  }
  if (!response.parsed_output) {
    throw new ApiError(422, "Could not read the cheque — try a sharper, well-lit photo or enter the details manually");
  }
  return response.parsed_output;
}
