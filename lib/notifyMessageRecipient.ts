export async function notifyMessageRecipient(messageId: string) {
  try {
    await fetch('/api/messages/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    });
  } catch (error) {
    console.error('Message notification failed:', error);
  }
}
