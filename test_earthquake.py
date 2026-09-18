import asyncio

from earthquake_service import get_earthquakes


async def main():

    earthquakes = await get_earthquakes()

    print()
    print("=" * 50)
    print("🛡️ RAKSHAK AI - USGS EARTHQUAKE TEST")
    print("=" * 50)

    print(
        f"Live earthquakes inside Nepal monitoring region: "
        f"{len(earthquakes)}"
    )

    if not earthquakes:

        print()
        print(
            "ℹ️ No current USGS earthquake events "
            "were found inside the Nepal monitoring region."
        )

        print(
            "✅ USGS connection and Nepal filter are working."
        )

        return

    for earthquake in earthquakes[:10]:

        print()
        print("-" * 50)

        print(
            f"ID: {earthquake['id']}"
        )

        print(
            f"Type: {earthquake['type']}"
        )

        print(
            f"Magnitude: {earthquake['magnitude']}"
        )

        print(
            f"Location: {earthquake['location']}"
        )

        print(
            f"Latitude: {earthquake['latitude']}"
        )

        print(
            f"Longitude: {earthquake['longitude']}"
        )

        print(
            f"Severity: {earthquake['severity']}"
        )

        print(
            f"Region: {earthquake['region']}"
        )

        print(
            f"Source: {earthquake['source']}"
        )

        print(
            f"Time: {earthquake['timestamp']}"
        )


if __name__ == "__main__":

    asyncio.run(main())