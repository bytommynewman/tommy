/**
 * Ad / screen-recording mode (GR_MARKETING_CAPTURE=1, set only by marketing/capture scripts on their own scratch server).
 * Hides the "Demo" badges and demo wording so footage never shows them; real users never see any difference.
 */
export const marketingCapture = (): boolean => process.env.GR_MARKETING_CAPTURE === "1";
