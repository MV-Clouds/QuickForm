export const createJSONBody = (to, type, replyId, data) => {
    try {
        const payload = {
            messaging_product: "whatsapp",
            to,
            type
        };

        if (replyId) {
            payload.context = { message_id: replyId };
        }

        if (type === "text" && data?.textBody) {
            payload.text = {
                body: data.textBody.replace(/\n/g, "\\n")  // Optional: Preserve \n if needed
            };
        }
        return JSON.stringify(payload);
    } catch (e) {
        console.error('Error in function createJSONBody:::', e.message);
        return null;
    }
}