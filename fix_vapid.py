
import asyncio
import os
import sys
import base64

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def generate_vapid_keys():
    """Generate VAPID keys using cryptography library (standard)."""
    try:
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives import serialization
        
        # Generate private key
        private_key = ec.generate_private_key(ec.SECP256R1())
        
        # Extract private key bytes (raw)
        # VAPID private key is just the private scalar (32 bytes)
        priv_bytes = private_key.private_numbers().private_value.to_bytes(32, 'big')
        
        # Extract public key bytes (uncompressed format 0x04 + x + y)
        pub_bytes = public_key_bytes = private_key.public_key().public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint
        )
        
        # Encode to URL-safe base64 without padding
        def b64_url(b):
            return base64.urlsafe_b64encode(b).decode('utf-8').rstrip('=')
            
        return b64_url(pub_bytes), b64_url(priv_bytes)
    except Exception as e:
        print(f"❌ Error generating keys: {e}")
        return None, None

async def fix():
    print("🛡️ RemiNote VAPID Fix Tool (Standalone Mode) starting...")
    
    pub, priv = generate_vapid_keys()
    if not pub or not priv:
        print("❌ Failed to generate keys using cryptography.")
        return

    from app.database import async_session
    from app.models.setting import SystemSetting
    from sqlalchemy import select

    async with async_session() as db:
        print("🔍 Injecting keys into database...")
        for k, v_val in [("VAPID_PUBLIC_KEY", pub), ("VAPID_PRIVATE_KEY", priv)]:
            res = await db.execute(select(SystemSetting).where(SystemSetting.key == k))
            s = res.scalar_one_or_none()
            if not s:
                db.add(SystemSetting(key=k, value=v_val, description="Standalone VAPID Key", category="security"))
            else:
                s.value = v_val
        
        try:
            await db.commit()
            print("🚀 SUCCESS! VAPID keys injected.")
            print(f"Public Key: {pub}")
        except Exception as e:
            print(f"❌ Database error: {e}")

if __name__ == "__main__":
    asyncio.run(fix())
