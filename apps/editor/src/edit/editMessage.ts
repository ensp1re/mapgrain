/**
 * Validator messages name the rule that failed. They are accurate but they do not say what
 * to do about it, and they used to reach the user verbatim.
 */
const GUIDANCE: Array<{ match: RegExp; advice: string }> = [
  {
    match: /decision outcome on edge .* is missing a label/,
    advice: "Select that connection and give it an Outcome, so the branch says when it is taken.",
  },
  {
    match: /lifecycle diagrams need an initial state/,
    advice: "Select a state and set its Marker to initial, so the diagram has somewhere to start.",
  },
  {
    match: /node kind ".+" is not valid on a .+ diagram/,
    advice: "Pick a type this diagram kind allows, or switch the diagram kind from the command menu.",
  },
  {
    match: /needs a unique order|order/,
    advice: "Sequence messages are ordered. Give this message an order no other message uses.",
  },
];

export function editMessage(raw: string): string {
  const hit = GUIDANCE.find((entry) => entry.match.test(raw));
  return hit ? `${raw}. ${hit.advice}` : raw;
}
