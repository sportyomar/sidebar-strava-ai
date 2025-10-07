def match_condition(item, field, equals):
    return str(item.get(field)) == str(equals)

def apply_filters(filter_def, data):
    if not filter_def or not isinstance(filter_def, dict) or not isinstance(data, list):
        return []

    logic = filter_def.get("logic", "AND").upper()
    conditions = filter_def.get("conditions", [])

    def matches(item):
        results = [match_condition(item, cond["field"], cond["equals"]) for cond in conditions]
        return any(results) if logic == "OR" else all(results)

    return [item for item in data if matches(item)]
