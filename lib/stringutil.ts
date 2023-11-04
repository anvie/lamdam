export function truncate(str: string, n: number): string {
  if (!str) return "";
  return str.length > n ? str.substring(0, n - 1) + "…" : str;
}

export function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let randomString = '';

  for (let i = 0; i < length; i++) {
    randomString += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return randomString;
}

export function formattedMessage(prompt: string, input?: string, response?: string, history?: string[][]) {
  const formattedHistory = history
    ? history.map(function (historyItem) {
      if (historyItem.length === 0) {
        return "\n";
      }
      return JSON.stringify(historyItem);
    })
    : [];
  return `
${formattedHistory.join("\n")}
${prompt}
${input}
${response}`.trim();
}