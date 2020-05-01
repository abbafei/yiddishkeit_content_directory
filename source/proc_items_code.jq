def is_in(vals): [. == [vals][]] | any;
def defs_numbered: to_entries | with_entries(.value.value.sort_num = .key | .value);
def has_def($defs): is_in($defs | keys[]);
def grouped_array_items(key; $defs): group_by(key) | map(
    (.[0] | key) as $key_id |
    # select keys that have a definition in type defs and that have a title in their type def entry
    select($key_id | (has_def($defs) and ($defs[$key_id] | has("title")))) |
    # adds type information based on id of a group
    [{id: $key_id, title: $defs[$key_id].title}, .]
) | sort_by($defs[.[0].id].sort_num);
(.[0] |= (
    # preprocess items: simple expansions (from items input format to output format), etc.
    def update_key($key; code_uk): if has($key) then (.[$key] |= (code_uk)) else . end;
    def expand_endpoint: if type == "string" then {ref: .} else . end;
    def expand_fee_entry: if type == "boolean" then {has_fee: .} else . end;
    with_entries(.value |= (
        update_key("fee"; if type == "array" then
            map(expand_fee_entry)
        else
            [expand_fee_entry]
        end) |
        update_key("fee"; map(select(if has("until") then (.until | strptime("%Y-%m-%dT%H:%M:%S%Z") | mktime) > now else true end))) | if has("fee") and (.fee | length) == 0 then del(.fee) else . end |
        update_key("related_ids"; with_entries(.value |= if type == "string" then [.] else . end)) |
        update_key("endpoints"; if type == "string" then
            {web: [expand_endpoint]}
        else
            with_entries(.value |= (if type == "string" then
                [expand_endpoint]
            else
                map(expand_endpoint)
            end))
        end)
    ))
)) |
# process type definitions
(.[1] | (
    # add numbers to types that have an order
    (.categories |= defs_numbered) |
    (.media_types |= defs_numbered)
)) as $types |
.[0] |
# unwrap key/vals to array with key as .id of each item in array
to_entries | map(.value.id = .key | .value) |
# add english as default language when none is present (TODO: get default lang from schema? or from entry in types?)
map(if has("languages") then . else (.languages |= ["en"]) end) |
# select english content
map(select(.languages as $langs | "en" | is_in($langs[]))) |
# organize related_ids
map(if .related_ids then .related_ids |= (
    to_entries |
    map(.key as $key | .value[] | [., $key]) |
    group_by(.[0]) |
    map({key: .[0][0], value: map(.[1])}) | from_entries
) else . end) |
# expand endpoint refs to urls
map(if .endpoints then .endpoints |= (with_entries(
    .key as $endpoint_type |
    (.value |= (map(
        # render refs to urls
        if $types.endpoints[$endpoint_type] | has("formatter") then
            .ref as $ref |
            .url = ($types.endpoints[$endpoint_type].formatter | sub("\\$1"; $ref))
        else . end
    )))
)) else . end) |
# filter endpoints whose type does not have a url and title
map(
    if has("endpoints") then 
        (.endpoints |= (
            with_entries(
                (.value |= map(select(has("url")))) |
                select((.value | length) > 0 and ($types.endpoints[.key] | has("title")))
            )
        )) |
        if (.endpoints | length) == 0 then del(.endpoints) else . end
    else . end
) |
# prepare output object
{
    all: 
        # select related_ids that have a title
        map(
            if has("related_ids") then
                (.related_ids |=
                    with_entries(select($types.related_id_types[.key] | has("title")))
                ) |
                if (.related_ids | length) == 0 then del(.related_ids) else . end
            else . end
        ) |
        # select container_types that have title
        map(if has("container_type") then
            if $types.container_types[.container_type] | has("title") then . else del(.container_type) end
        else . end)
    ,
    dict: map({key: .id, value: del(.id)}) | from_entries, # rewrapped into dict
    grouped:
        # filter out items that have no endpoints
        map(select(has("endpoints"))) |
        # filter out items that have a fee, are a subitem of something, and have content_type "item"
        map(select(((.fee[0].has_fee == true) and (.related_ids.subitem_of != null) and (.content_type == "item")) | not)) |
        # group items
        grouped_array_items(.media_type; $types.media_types) |
        map(.[1] |= (
            grouped_array_items(.main_category; $types.categories)
        ))
    ,
}
