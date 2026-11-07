// SPDX-License-Identifier: AGPL-3.0-or-later
// SSE-style event stream for the station helper, entirely on the device:
//   { type: "thinking", step: { id, label, state: "active" | "done" } }
//   { type: "delta", text }   — the next slice of the reply
//   { type: "done", places }  — the reply is complete
// The thinking steps describe what the offline engine really did (which data
// it searched and what it found). The answer is already computed: delays
// animate its processing summary, and are not measured inference timings.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Split text into chunks of whole graphemes (keeps Thai marks and emoji intact). */
export function chunkText(text, size = 2) {
  const value = String(text ?? "");
  const graphemes =
    typeof Intl !== "undefined" && Intl.Segmenter
      ? [
          ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
            value
          ),
        ].map((part) => part.segment)
      : Array.from(value);
  const chunks = [];
  for (let i = 0; i < graphemes.length; i += size)
    chunks.push(graphemes.slice(i, i + size).join(""));
  return chunks;
}

/** The steps the offline engine took to reach this answer. */
export function answerSteps(answer, { t }) {
  const understand = { id: "understand", label: t("chat.think.understand") };
  const compose = { id: "compose", label: t("chat.think.compose") };
  if (answer.kind === "places") {
    const search =
      answer.type === "exit"
        ? t("chat.think.searchExit", { code: answer.code, count: answer.total })
        : answer.total
        ? t("chat.think.searchPlaces", {
            count: answer.total,
            type: t(`type.${answer.type}`),
          })
        : t("chat.think.noneFound", { type: t(`type.${answer.type}`) });
    return [understand, { id: "search", label: search }, compose];
  }
  if (answer.kind === "faq")
    return [
      understand,
      { id: "topic", label: t("chat.think.matchTopic") },
      compose,
    ];
  if (answer.kind === "fallback")
    return [
      understand,
      { id: "topic", label: t("chat.think.noAnswer") },
      compose,
    ];
  return [understand];
}

export async function* streamLocalAnswer(
  answer,
  i18n,
  { wait = sleep, signal, stepDelay = 280, chunkDelay = 22, chunkSize = 2 } = {}
) {
  for (const step of answerSteps(answer, i18n)) {
    if (signal?.aborted) return;
    yield { type: "thinking", step: { ...step, state: "active" } };
    await wait(stepDelay);
    if (signal?.aborted) return;
    yield { type: "thinking", step: { ...step, state: "done" } };
  }
  for (const text of chunkText(answer.text, chunkSize)) {
    if (signal?.aborted) return;
    yield { type: "delta", text };
    await wait(chunkDelay);
  }
  if (signal?.aborted) return;
  yield { type: "done", places: answer.places };
}
