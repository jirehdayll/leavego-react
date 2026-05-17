-- Migration: Add separate name fields to profiles table
-- This migration adds first_name, middle_name, and surname columns to the profiles table
-- while maintaining backward compatibility with existing full_name field

-- Add separate name fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS middle_name TEXT,
ADD COLUMN IF NOT EXISTS surname TEXT;

-- Create a function to update existing records with parsed names
CREATE OR REPLACE FUNCTION update_profile_names()
RETURNS void AS $$
DECLARE
    profile_record RECORD;
    name_parts TEXT[];
BEGIN
    -- Loop through all profiles that have full_name but no separate name fields
    FOR profile_record IN 
        SELECT id, full_name 
        FROM profiles 
        WHERE full_name IS NOT NULL 
        AND full_name != '' 
        AND (first_name IS NULL OR surname IS NULL)
    LOOP
        -- Split the full_name into parts
        name_parts := string_to_array(profile_record.full_name, ' ');
        
        -- Update the profile with parsed name components
        UPDATE profiles SET
            first_name = CASE 
                WHEN array_length(name_parts, 1) >= 1 THEN name_parts[1]
                ELSE NULL
            END,
            middle_name = CASE 
                WHEN array_length(name_parts, 1) > 2 THEN array_to_string(name_parts[2:array_length(name_parts, 1)-1], ' ')
                WHEN array_length(name_parts, 1) = 2 AND name_parts[2] ~ '[A-Za-z]' THEN name_parts[2]
                ELSE NULL
            END,
            surname = CASE 
                WHEN array_length(name_parts, 1) >= 2 THEN name_parts[array_length(name_parts, 1)]
                ELSE NULL
            END
        WHERE id = profile_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the function to populate the new fields
SELECT update_profile_names();

-- Drop the temporary function
DROP FUNCTION update_profile_names();

-- Add comments to document the new columns
COMMENT ON COLUMN profiles.first_name IS 'First name of the user';
COMMENT ON COLUMN profiles.middle_name IS 'Middle name(s) of the user';
COMMENT ON COLUMN profiles.surname IS 'Surname/Last name of the user';

-- Create an updated trigger to maintain full_name when separate fields change
CREATE OR REPLACE FUNCTION update_full_name_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Update full_name when separate name fields change
    NEW.full_name = TRIM(
        COALESCE(NEW.first_name, '') || ' ' || 
        COALESCE(NEW.middle_name, '') || ' ' || 
        COALESCE(NEW.surname, '')
    );
    
    -- Remove extra spaces and clean up
    NEW.full_name = REGEXP_REPLACE(NEW.full_name, '\s+', ' ', 'g');
    NEW.full_name = TRIM(NEW.full_name);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update full_name when separate fields are updated
DROP TRIGGER IF EXISTS update_full_name_on_profiles ON profiles;
CREATE TRIGGER update_full_name_on_profiles
    BEFORE INSERT OR UPDATE OF first_name, middle_name, surname
    ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_full_name_trigger();

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_profiles_first_name ON profiles(first_name);
CREATE INDEX IF NOT EXISTS idx_profiles_surname ON profiles(surname);
