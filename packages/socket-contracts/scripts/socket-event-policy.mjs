import ts from 'typescript'

export const reservedSocketIoEvents = new Set([
  'connect',
  'connect_error',
  'disconnect',
  'reconnect_attempt'
])

const socketReceiverPattern = /(?:^|\.)(?:socket|socketServer|server|client)(?:\.|$)/

const propertyName = (expression) => {
  if (ts.isIdentifier(expression)) return expression.text
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text
  if (
    ts.isElementAccessExpression(expression) &&
    expression.argumentExpression &&
    ts.isStringLiteralLike(expression.argumentExpression)
  ) {
    return expression.argumentExpression.text
  }
  return undefined
}

const receiverText = (expression, sourceFile) => {
  if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
    return expression.expression.getText(sourceFile)
  }
  return ''
}

export const collectBoundaryLiterals = (sourceText, fileName = 'source.ts') => {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  )
  const boundaries = []

  const visit = (node) => {
    if (ts.isDecorator(node) && ts.isCallExpression(node.expression)) {
      const decoratorName = propertyName(node.expression.expression)
      const [argument] = node.expression.arguments
      if (decoratorName === 'SubscribeMessage' && argument && ts.isStringLiteralLike(argument)) {
        boundaries.push({
          eventName: argument.text,
          line: sourceFile.getLineAndCharacterOfPosition(argument.getStart()).line + 1
        })
      }
    }

    if (ts.isCallExpression(node)) {
      const method = propertyName(node.expression)
      const [argument] = node.arguments
      const receiver = receiverText(node.expression, sourceFile)
      if (
        (method === 'emit' || method === 'on' || method === 'once') &&
        argument &&
        ts.isStringLiteralLike(argument) &&
        socketReceiverPattern.test(receiver)
      ) {
        boundaries.push({
          eventName: argument.text,
          line: sourceFile.getLineAndCharacterOfPosition(argument.getStart()).line + 1
        })
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return boundaries
}

export const findSocketEventPolicyViolations = ({
  sourceText,
  fileName,
  declaredEventNames
}) => collectBoundaryLiterals(sourceText, fileName).flatMap(({ eventName, line }) => {
  if (reservedSocketIoEvents.has(eventName)) return []
  if (declaredEventNames.has(eventName)) {
    return [{
      fileName,
      line,
      eventName,
      reason: 'declared event names must be referenced through socketEventRegistry'
    }]
  }
  return [{
    fileName,
    line,
    eventName,
    reason: 'Socket.IO boundary uses an undeclared event name'
  }]
})
