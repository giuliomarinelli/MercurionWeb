import { Field, ObjectType } from "@nestjs/graphql";
import { TicketMessageResponse, TicketResponse } from "./help-response.dto";

@ObjectType()
export class TicketDetailDTO {
  @Field(() => TicketResponse)
  ticket!: TicketResponse

  @Field(() => [TicketMessageResponse], { nullable: true })
  messages?: TicketMessageResponse[] | null
}
