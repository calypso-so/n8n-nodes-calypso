FROM n8nio/n8n:latest

# Copy the custom node package
COPY calypsohq-n8n-nodes-calypso-1.0.2.tgz /tmp/

# Install the custom node
USER root
RUN cd /usr/local/lib/node_modules/n8n && \
    npm install /tmp/calypsohq-n8n-nodes-calypso-1.0.2.tgz

USER node 