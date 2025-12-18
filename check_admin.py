import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os

# 默认配置，如果环境变量没有设置
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+aiomysql://root:root@localhost:3306/chicken_king")

async def check_users():
    try:
        engine = create_async_engine(DATABASE_URL)
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT id, username, role, linux_do_username FROM users"))
            users = result.fetchall()
            
            print(f"{'ID':<5} {'Username':<20} {'Role':<15} {'Linux.do User':<20}")
            print("-" * 60)
            for user in users:
                print(f"{user.id:<5} {user.username:<20} {user.role:<15} {user.linux_do_username or 'N/A':<20}")
                
            if not users:
                print("No users found.")
                
    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    asyncio.run(check_users())
