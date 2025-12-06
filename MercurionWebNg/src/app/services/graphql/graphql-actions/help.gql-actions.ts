import { gql } from "apollo-angular";

export const MY_TICKET_DETAIL = gql`
  query MyTicketDetail($ticketId: ID!) {
    myTicketDetail(ticketId: $ticketId) {
        ticket {
            id
            publicId
            subject
            status
            lastMessageAt
            createdAt
            updatedAt
        }
    }
  }
`

export const MY_TICKETS = gql`
  query MyTickets($page: Int!, $limit: Int!) {
    myTickets(page: $page, limit: $limit) {
        itemCount
        totalItems
        itemsPerPage
        totalPages
        currentPage
        items {
            id
            publicId
            subject
            status
            lastMessageAt
            createdAt
            updatedAt
        }
    }
  }
`

export const MY_TICKET_MESSAGES = gql`
  query MyTicketMessages($page: Int!, $limit: Int!, $ticketId: ID!) {
    myTicketMessages(
        page: $page,
        limit: $limit,
        ticketId: $ticketId
    ) {
        itemCount
        totalItems
        itemsPerPage
        totalPages
        currentPage
        items {
            id
            publicId
            ticketId
            authorType
            contentDelta
            contentHtml
            createdAt
        }
    }
  }
`

export const CREATE_TICKET = gql`
  mutation CreateTicket($subject: String!, $contentHtml: String!, $contentDelta: JSON!) {
    createTicket(subject: $subject, contentHtml: $contentHtml, contentDelta: $contentDelta) {
        id
        publicId
        subject
        status
        lastMessageAt
        createdAt
        updatedAt
    }
  }
`

export const ADD_TICKET_MESSAGE = gql`
  mutation AddTicketMessage($ticketId: ID!, $contentDelta: JSON!, $contentHtml: String!) {
    addTicketMessage(ticketId: $ticketId, contentDelta: $contentDelta, contentHtml: $contentHtml)
  }
`

export const CLOSE_MY_TICKET = gql`
  mutation CloseMyTicket($ticketId: ID!) {
    closeMyTicket(ticketId: $ticketId)
  }
`

export const TICKET_DETAIL_AS_SUPPORT = gql`
  query TicketDetailAsSupport($ticketId: ID!) {
    ticketDetailAsSupport(ticketId: $ticketId) {
        ticket {
            id
            publicId
            subject
            status
            lastMessageAt
            createdAt
            updatedAt
            userId
            userFullName
        }
    }
  }
`

export const TICKETS_AS_SUPPORT = gql`
  query TicketsAsSupport($page: Int!, $limit: Int!) {
    ticketsAsSupport(page: $page, limit: $limit) {
        itemCount
        totalItems
        itemsPerPage
        totalPages
        currentPage
        items {
            id
            publicId
            subject
            status
            lastMessageAt
            createdAt
            updatedAt
            userId
            userFullName
        }
    }
  }
`

export const TICKET_MESSAGES_AS_SUPPORT = gql`
  query TicketMessagesAsSupport($page: Int!, $limit: Int!, $ticketId: ID!) {
    ticketMessagesAsSupport(page: $page, limit: $limit, ticketId: $ticketId) {
        itemCount
        totalItems
        itemsPerPage
        totalPages
        currentPage
        items {
            id
            publicId
            ticketId
            authorType
            contentDelta
            contentHtml
            createdAt
            userId
            authorId
            userFullName
            authorFullName
        }
    }
  }
`

export const ADD_SUPPORT_TICKET_MESSAGE = gql`
  mutation AddSupportTicketMessage($ticketId: ID!, $contentDelta: JSON!, $contentHtml: String!) {
    addSupportTicketMessage(ticketId: $ticketId, contentDelta: $contentDelta, contentHtml: $contentHtml)
  }
`

export const CLOSE_TICKET_AS_SUPPORT = gql`
  mutation CloseTicketAsSupport($ticketId: ID!) {
    closeTicketAsSupport(ticketId: $ticketId)
  }
`

export const REOPEN_TICKET_AS_SUPPORT = gql`
  mutation ReopenTicketAsSupport($ticketId: ID!) {
    reopenTicketAsSupport(ticketId: $ticketId)
  }
`
