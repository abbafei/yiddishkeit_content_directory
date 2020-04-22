#!/bin/sh
# B"H.
y2j(){
	npx js-yaml
	#yaml2json --preserve-key-order
}
preproc_items(){
	y2j | jq '
	def update_key($key; code_uk): if has($key) then (.[$key] |= code_uk) else . end;
	#def expand_val($type; code_ev): if $type == type then code_ev else . end;
	def expand_endpoint: if type == "string" then {ref: .} else . end; #def expand_endpoint: expand_val("string"; {ref: .});
	def expand_fee_entry: if type == "boolean" then {has_fee: .} else . end; # def expand_fee_entry: expand_val("boolean"; {has_fee: .});
	with_entries(.value |= (
		update_key("title"; if type == "string" then {main: .} else . end) |
		update_key("item_type"; if type == "string" then [.] else . end) |
		update_key("fee"; if type == "array" then
			map(expand_fee_entry)
		else
			[expand_fee_entry]
		end) |
		update_key("fee"; map(select(if has("until") then (.until | strptime("%Y-%m-%dT%H:%M:%S%Z") | mktime) > now else true end))) | if has("fee") and (.fee | length) == 0 then del(.fee) else . end |
		update_key("endpoints"; if type == "string" then
			{web: [expand_endpoint]}
		else
			with_entries(.value |= (if type == "string" then
				[expand_endpoint]
			else
				map(expand_endpoint)
			end))
		end) |
		if has("languages") then . else (.languages |= ["en"]) end
	))'
}
if [ -z "$1" ]; then
	preproc_items
elif [ "$1" = 'organized' ]; then
	(
		cat items.yml | preproc_items
		cat types.yml | y2j
	) | jq --slurp '
		def is_in(vals): [. == [vals][]] | any;
		def defs_numbered: to_entries | with_entries(.value.value.sort_num = .key | .value);
		def has_def($defs): is_in($defs | keys[]);
		def get_def($defs): . as $id | $defs[$id] | .id = $id;
		def grouped_array(key; $defs): group_by(key) | map(
			# adds type infomation based on id of a group
			select(.[0] | key | has_def($defs)) |
			[(.[0] | key | get_def($defs)), .]
		) | sort_by(.[0].sort_num);
		(.[1] | (
			# add numbers to types that have an order
			(.categories |= defs_numbered) |
			(.content_types |= defs_numbered)
		)) as $types |
		{
			items:
				.[0] | to_entries |
				map(.value.id = .key | .value) |
				# select english content
				map(select(.languages as $langs | "en" | is_in($langs[]))) |
				# filter out items that have a fee, have a parent (that ideally should contain the item), and have item_type "item"
				map(select(((has("fee") and .fee[0].has_fee == true) and has("site_id") and (.item_type as $item_type | "item" | is_in($item_type[]))) | not)) |
				# retrieve target audience defs
				map(if .target_audience then .target_audience |= (
					map(select(has_def($types.target_audiences)) | get_def($types.target_audiences))
				) | if (.target_audience | length) == 0 then del(.target_audience) else  . end else . end) |
				# expand endpoint refs to urls
				map(if .endpoints then .endpoints |= (with_entries(
					.key as $endpoint_type |
					(.value |= (map(
						.ref as $ref |
						.url = ($types.endpoints[$endpoint_type].formatter | sub("\\$1"; $ref))
					) | {title: $types.endpoints[$endpoint_type].title, entries: .}))
				)) else . end) |
				{
					all: .,
					grouped:
						grouped_array(.content_type; $types.content_types) |
						map(.[1] |= (
							grouped_array(.category.main; $types.categories)
						))
					,
				}
			,
			#types: $types,
		} |
		.items
	' | tee _data/items.json
fi
