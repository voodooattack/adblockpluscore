#!/usr/bin/env bash

bold=$(tput bold)
normal=$(tput sgr0)

if [ ! -f easylist.txt ]; then
    curl -O https://easylist-downloads.adblockplus.org/easylist.txt
fi

if [ ! -f exceptionrules.txt ]; then
    curl -O https://easylist-downloads.adblockplus.org/exceptionrules.txt
fi

echo "-------------------"
echo "${bold}without compression:${normal}"
echo "-------------------"
cat easylist.txt exceptionrules.txt | node --expose-gc filter-compression.js $@
echo "-------------------"
echo "${bold}with compression:${normal}"
echo "-------------------"
cat easylist.txt exceptionrules.txt | node --expose-gc filter-compression.js -c $@
