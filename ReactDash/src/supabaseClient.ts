import { createClient, SupabaseClient } from '@supabase/supabase-js'


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabaseUrltetum = import.meta.env.VITE_SUPABASE_URL_TETUM
const supabaseKeyTetum = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY_TETUM

function createDatabaseClients() {
    if (!supabaseUrl || !supabaseKey || !supabaseUrltetum || !supabaseKeyTetum ){
        console.error('Missing Supabase environment variables')
        return {supabase: null, supabaseKeyTetum: null}
    }

    let supabase: SupabaseClient
    let supabaseTetum: SupabaseClient

    try {
        supabase = createClient(supabaseUrl, supabaseKey)
    }
    catch (error) {
        console.error('Failed to create english supabase client', error)
        return {supabase: null, supabaseKeyTetum: null}
    }

    try {
        supabaseTetum = createClient(supabaseUrltetum, supabaseKeyTetum)
    }
    catch (error) {
        console.error('Failed to create tetum supabase client', error)
        return {supabase: null, supabaseKeyTetum: null}
    }

    return {supabase, supabaseTetum}



}

const {supabase, supabaseTetum} = createDatabaseClients()

export {supabase, supabaseTetum}
    

