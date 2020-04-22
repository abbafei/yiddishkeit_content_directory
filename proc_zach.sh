#!/bin/sh
# B"H.
preproc_items(){
	yaml2json --preserve-key-order | jq '
	def update_key($key; code): if has($key) then (.[$key] |= code) else . end;
	def expand_val($type; code): if type == $type then code else . end;
	def expand_endpoint: if type == "string" then {ref: .} else . end; #def expand_endpoint: expand_val("string"; {ref: .});
	def expand_fee_entry: if type == "boolean" then {has_fee: .} else . end; # def expand_fee_entry: expand_val("boolean"; {has_fee: .});
	with_entries(.value |= (
		update_key("title"; expand_val("string"; {main: .})) |
		update_key("item_type"; expand_val("string"; [.])) |
		update_key("fee"; if type == "array" then
			map(expand_fee_entry)
		else
			[expand_fee_entry]
		end) |
		update_key("fee"; [.[] | select(if has("until") then (.until | strptime("%Y-%m-%dT%H:%M:%S%Z") | mktime) > now else true end)]) |
		update_key("endpoints"; if type == "string" then
			{web: [expand_endpoint]}
		else
			with_entries(.value |= (if type == "string" then
				[expand_endpoint]
			else
				map(expand_endpoint)
			end))
		end)
	))'
}
if [ -z "$1" ]; then
	preproc_items
elif [ "$1" = 'organized' ]; then
	(
		cat items.yml | preproc_items
		cat types.yml | yaml2json --preserve-key-order
	) | jq --slurp '
		def is_in(vals): [. == [vals][]] | any;
		def defs_numbered: to_entries | with_entries(.value.value.sort_num = .key | .value);
		def grouped_array(key; $defs): group_by(key) | [
			.[] |
			select(.[0] | key | is_in($defs | keys[])) |
			[((.[0] | key) as $id | $defs[$id] | .id = $id), .]
		] | sort_by(.[0].sort_num);
		(.[1] | (
			(.categories |= defs_numbered) |
			(.content_types |= defs_numbered)
		)) as $types |
		{
			items:
				.[0] | to_entries |
				map(.value.id = .key | .value) |
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
		}
	' | tee _data/items.json
fi
