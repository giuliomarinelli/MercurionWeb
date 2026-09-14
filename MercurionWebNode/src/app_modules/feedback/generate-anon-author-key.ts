import { createHmac, UUID } from "crypto"
import { getValidatedEnvironment } from 'src/config/env-validation'

export function generateAnonAuthorKey(userId: UUID): string {
    const secret = getValidatedEnvironment().UM_FEEDBACK_ANON_AUTHOR_KEY
    return createHmac('sha256', secret)
        .update(`feedback:${userId}`)
        .digest('base64url')
}