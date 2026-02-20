/*
  # Barbershop Booking System Schema

  ## Overview
  This migration creates the complete database schema for a barbershop booking application.

  ## New Tables

  ### 1. `profiles`
  - `id` (uuid, primary key, references auth.users)
  - `full_name` (text)
  - `phone` (text)
  - `avatar_url` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  User profile information extending Supabase auth.

  ### 2. `services`
  - `id` (uuid, primary key)
  - `name` (text) - Service name (e.g., "Corte de Pelo", "Barba")
  - `description` (text)
  - `price` (decimal)
  - `duration_minutes` (integer) - Duration of service
  - `image_url` (text)
  - `active` (boolean) - Whether service is currently offered
  - `created_at` (timestamptz)
  Available barbershop services.

  ### 3. `barbers`
  - `id` (uuid, primary key)
  - `name` (text)
  - `bio` (text)
  - `image_url` (text)
  - `specialties` (text array)
  - `rating` (decimal)
  - `active` (boolean)
  - `created_at` (timestamptz)
  Barber profiles with images and information.

  ### 4. `appointments`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `barber_id` (uuid, references barbers)
  - `service_id` (uuid, references services)
  - `appointment_date` (date)
  - `appointment_time` (time)
  - `location_type` (text) - 'barbershop' or 'home'
  - `payment_method` (text) - 'cash' or 'transfer'
  - `status` (text) - 'pending', 'confirmed', 'completed', 'cancelled'
  - `total_price` (decimal)
  - `notes` (text)
  - `created_at` (timestamptz)
  Customer appointments.

  ### 5. `favorites`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `barber_id` (uuid, references barbers)
  - `created_at` (timestamptz)
  User's favorite barbers.

  ### 6. `products`
  - `id` (uuid, primary key)
  - `name` (text)
  - `description` (text)
  - `price` (decimal)
  - `image_url` (text)
  - `stock` (integer)
  - `category` (text)
  - `active` (boolean)
  - `created_at` (timestamptz)
  Products available in the shop.

  ### 7. `wallet_transactions`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `amount` (decimal)
  - `type` (text) - 'credit' or 'debit'
  - `description` (text)
  - `created_at` (timestamptz)
  Wallet transaction history.

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users to manage their own data
  - Add policies for viewing public data (services, barbers, products)
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  wallet_balance decimal DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  image_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active services"
  ON services FOR SELECT
  TO authenticated
  USING (active = true);

-- Create barbers table
CREATE TABLE IF NOT EXISTS barbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bio text,
  image_url text,
  specialties text[],
  rating decimal DEFAULT 5.0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active barbers"
  ON barbers FOR SELECT
  TO authenticated
  USING (active = true);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  barber_id uuid REFERENCES barbers(id) NOT NULL,
  service_id uuid REFERENCES services(id) NOT NULL,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  location_type text NOT NULL DEFAULT 'barbershop',
  payment_method text NOT NULL DEFAULT 'cash',
  status text NOT NULL DEFAULT 'pending',
  total_price decimal NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  barber_id uuid REFERENCES barbers(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, barber_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favorites"
  ON favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal NOT NULL,
  image_url text,
  stock integer DEFAULT 0,
  category text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  TO authenticated
  USING (active = true);

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount decimal NOT NULL,
  type text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON wallet_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert sample data for services
INSERT INTO services (name, description, price, duration_minutes) VALUES
  ('Corte de Pelo', 'Corte de cabello profesional', 15000, 30),
  ('Barba', 'Arreglo y diseño de barba', 10000, 20),
  ('Pack Completo', 'Corte + Barba + Lavado', 30000, 60),
  ('Lavado de Cabello', 'Lavado con productos premium', 8000, 15),
  ('Cejas', 'Perfilado de cejas', 5000, 10),
  ('Tinte de Cabello', 'Tinte profesional', 25000, 90),
  ('Tratamiento Capilar', 'Tratamiento revitalizante', 20000, 45)
ON CONFLICT DO NOTHING;

-- Insert sample data for barbers
INSERT INTO barbers (name, bio, specialties, rating) VALUES
  ('Carlos Martínez', 'Especialista en cortes modernos con 10 años de experiencia', ARRAY['Cortes Modernos', 'Fade', 'Diseño de Barba'], 4.8),
  ('Juan Pérez', 'Experto en barbería clásica y tradicional', ARRAY['Cortes Clásicos', 'Afeitado Navaja', 'Barba'], 4.9),
  ('Miguel Rodríguez', 'Barbero versátil especializado en tendencias urbanas', ARRAY['Cortes Urbanos', 'Tintes', 'Diseños'], 4.7),
  ('Luis González', 'Maestro barbero con técnicas innovadoras', ARRAY['Todos los Estilos', 'Tratamientos', 'Cejas'], 5.0)
ON CONFLICT DO NOTHING;