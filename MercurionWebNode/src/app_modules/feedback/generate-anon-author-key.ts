import { createHmac, UUID } from "crypto"

export function generateAnonAuthorKey(userId: UUID): string {
    const secret = process.env.UM_FEEDBACK_ANON_AUTHOR_KEY!
    return createHmac('sha256', secret)
        .update(`feedback:${userId}`)
        .digest('base64url')
}