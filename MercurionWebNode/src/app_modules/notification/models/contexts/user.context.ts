import { UserCtaContext } from "./user-cta.context";

export type UserContext = Omit<UserCtaContext, 'url'>