UPDATE `combats` SET
  `document` = json_set(
    `document`,
    '$.units',
    (
      SELECT json_group_array(json_set(`unit`.`value`, '$.claimedBy', json('null')) ORDER BY `unit`.`key`)
      FROM json_each(`combats`.`document`, '$.units') AS `unit`
    ),
    '$.version',
    `version` + 1
  ),
  `version` = `version` + 1;--> statement-breakpoint
UPDATE `players` SET `watchingSince` = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE `watchingSince` IS NULL;
