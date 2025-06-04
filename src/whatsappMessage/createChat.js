export const create = ()=>{
    createChat({
        chatData: {
            message: this.messageText,
            templateId: this.selectedTemplate,
            messageType: 'text',
            replyToChatId: this.replyToMessage?.Id || null,
            phoneNumber: this.phoneNumber
        }
    })
    .then(chat => {
        if (!chat) {
            return;
        }
        const textPayload = this.createJSONBody(this.phoneNumber, "text", this.replyToMessage?.WhatsAppMessageId__c || null, {
            textBody: this.messageText
        });
    
        sendWhatsappMessage({
            jsonData: textPayload,
            chatId: chat.Id,
            isReaction: false,
            reaction: null
        })
        .then(result => {
            if (result.errorMessage === 'METADATA_ERROR') {
                this.showToast('Something went wrong!', 'Please add/update the configurations for WhatsApp.', 'error');
            }
            const resultChat = result.chat;
        })
        .catch(e => {
            console.error('Error sending WhatsApp message:', e);
        });
    })
    .catch(e => {
        const msg = e.body?.message === 'STORAGE_LIMIT_EXCEEDED'
            ? 'Storage Limit Exceeded, please free up space and try again.'
            : 'Message could not be sent, please try again.';
        this.showToast('Something went wrong!', msg, 'error');
        console.error('Error creating chat:', e);
    })
    .finally(() => {
    });
    
}