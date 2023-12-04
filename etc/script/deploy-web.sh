#!/bin/bash

set -e
mv .env .env.bak
source $(pwd)/.env.production

echo "Building app..."
yarn build

echo "Copy .next to Deployment Server"
rsync -avzrhcP --delete-after -e "ssh -i ${SSH_KEY}" ./.next ${DEPLOY_SERVER}:${APP_DIR}/
rsync -avzrhcP --delete-after -e "ssh -i ${SSH_KEY}" ./public ${DEPLOY_SERVER}:${APP_DIR}/

files=(
  "next.config.js"
  "package.json"
  "yarn.lock"
)

echo "Copy files to Deployment Server"
for file in "${files[@]}"; do
  echo "Copying ${file}..."
  scp -i ${SSH_KEY} -r ./$file ${DEPLOY_SERVER}:${APP_DIR}/
done

ssh -i ${SSH_KEY} ${DEPLOY_SERVER} "chown -R www:www ${APP_DIR}"

echo "Deploying web"
ssh -i ${SSH_KEY} ${DEPLOY_SERVER} "su - www -c '${APP_DIR}/start.sh'"

echo "Web deployed!".
mv .env.bak .env