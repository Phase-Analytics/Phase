These synthetic databases are from MaxMind's `MaxMind-DB` test suite:

- `country.mmdb`: https://github.com/maxmind/MaxMind-DB/blob/main/test-data/GeoIP2-Country-Test.mmdb
- `city.mmdb`: https://github.com/maxmind/MaxMind-DB/blob/main/test-data/GeoIP2-City-Test.mmdb

They are used under the included MIT license. The city fixture returns country
`SG` for `214.0.0.1`; the country fixture has no record for that address. Replacing
one with the other therefore verifies that lookups use the reloaded database.
