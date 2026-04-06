import asyncio
from httpx import AsyncClient

async def run():
    async with AsyncClient(base_url="http://localhost:8000/v1") as client:
        # test gadgets
        response = await client.get("/gadgets/")
        print("Gadgets:", response.json())

asyncio.run(run())
