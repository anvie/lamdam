#!/bin/bash

set -e
source $(pwd)/.env

echo "Building app..."
yarn build

echo "Copy .next to Deployment Server"
rsync -avzrhcP --delete-after -e "ssh -i ${SSH_KEY}" ./.next ${DEPLOY_SERVER}:${APP_DIR}/
rsync -avzrhcP --delete-after -e "ssh -i ${SSH_KEY}" ./public ${DEPLOY_SERVER}:${APP_DIR}/
# rsync -avzrhcP --delete-after -e "ssh -i ${SSH_KEY}" ./prisma ${DEPLOY_SERVER}:${APP_DIR}/

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

chown -R www:www ${APP_DIR}

#scp -i ${SSH_KEY} -r ./etc/scripts/issue_certificates.ts ${DEPLOY_SERVER}:${APP_DIR}/src/

# echo "Copy src/env"
# rsync -avzrhcP --delete-after -e "ssh -i ${SSH_KEY}" ./src/env ${DEPLOY_SERVER}:${APP_DIR}/src

echo "Deploying web"
#ssh -i ${SSH_KEY} ${DEPLOY_SERVER} "supervisorctl restart siskader"

echo "Web deployed!".
