/**
 * Pakistan-oriented Hijri (Islamic) calendar for react-date-object.
 *
 * Default `arabic` (civil) is often 1 day behind Pakistan’s official date.
 * Epoch 1948437 aligns with CLDR `islamic-tbla` (e.g. 18 Jul 2026 → 3 صفر 1448).
 */
import arabic from 'react-date-object/calendars/arabic'

const hijriPakistan = {
  ...arabic,
  name: 'hijri_pakistan',
  /** One day earlier than civil arabic epoch → +1 Hijri day vs Gregorian */
  epoch: 1948437,
}

export default hijriPakistan
