/** Роль відправника за обраною для одержувача роллю */

export function senderRoleForPair(recipientRole: "husband" | "wife" | "friend"): "husband" | "wife" | "friend" {
  if (recipientRole === "friend") return "friend";
  return recipientRole === "husband" ? "wife" : "husband";
}
