def log_change(supabase, entity_type, entity_id, operation):
    supabase.table("changelog").insert({
        "entity_type": entity_type,
        "entity_id": entity_id,
        "operation": operation,
        "version": get_next_version(supabase)
    }).execute()
    
def get_next_version(supabase):
    res = (
        supabase
        .table("changelog")
        .select("version")
        .order("version", desc=True)
        .limit(1)
        .execute()
    )
    return (res.data[0]["version"] + 1) if res.data else 1
