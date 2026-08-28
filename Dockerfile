FROM n8nio/n8n:latest

# Tarball produced by `npm pack`. Keep the default in step with package.json, or
# override at build time: docker build --build-arg PACKAGE_VERSION=1.2.0 .
ARG PACKAGE_VERSION=1.2.0

# Copy the custom node package
COPY calypsohq-n8n-nodes-calypso-${PACKAGE_VERSION}.tgz /tmp/

# Install the custom node
USER root
RUN cd /usr/local/lib/node_modules/n8n && \
    npm install /tmp/calypsohq-n8n-nodes-calypso-${PACKAGE_VERSION}.tgz

USER node
