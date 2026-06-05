FROM n8nio/n8n:latest

# Copy the custom node package
COPY n8n-nodes-calypso-1.0.0.tgz /tmp/

# Install the custom node
USER root
RUN cd /usr/local/lib/node_modules/n8n && \
    npm install /tmp/n8n-nodes-calypso-1.0.0.tgz

USER node 