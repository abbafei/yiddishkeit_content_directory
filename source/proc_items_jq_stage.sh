#!/bin/sh
# B"H.
y2j(){
	npx js-yaml
	#yaml2json --preserve-key-order
}

(
    cat items.yml | y2j
    cat types.yml | y2j
) | jq --slurp -f proc_items_code.jq
