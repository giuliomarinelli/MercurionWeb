ARG BASE_IMAGE=node:22.16.0-bookworm-slim
FROM ${BASE_IMAGE}
USER root
WORKDIR /usr/src/app
# The context contains allowlisted compiled JS, manifests and QA fixtures only.
COPY manifests/ ./
RUN cp package-lock.json /tmp/jwt-qa-lock.json \
    && npm install --ignore-scripts --no-audit --no-fund
COPY fixture/lock-check.cjs /tmp/lock-check.cjs
RUN node /tmp/lock-check.cjs
COPY contracts/ ./packages/
COPY runtime/ ./qa/runtime/
COPY fixture/ ./qa/
ENTRYPOINT ["node", "/usr/src/app/qa/verify.cjs"]
