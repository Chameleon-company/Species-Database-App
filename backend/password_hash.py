import bcrypt
hashed = bcrypt.hashpw(b"admin123", bcrypt.gensalt())
print(hashed.decode())