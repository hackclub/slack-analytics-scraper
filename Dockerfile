FROM node:14.4.0

COPY . /opt/app

# Cache dependencies
RUN mkdir -p /opt/app && \
    cd /opt/app && \
    npm install --production --unsafe-perm --loglevel warn

WORKDIR /opt/app

CMD ["npm", "start"]
