#!/bin/bash
# SERVER_NAME: public domain of this browser (e.g. primcare.sund.ku.dk / ptb.sund.ku.dk); "_" = any host
export SERVER_NAME="${SERVER_NAME:-_}"
envsubst '$FLASK_SERVER_ADDR $SERVER_NAME' < /tmp/default.conf > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'
