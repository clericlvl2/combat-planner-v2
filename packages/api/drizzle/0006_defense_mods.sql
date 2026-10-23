UPDATE `combats` SET
  `document` = json_set(
    `document`,
    '$.units',
    (
      SELECT json_group_array(
        json_set(
          `unit`.`value`,
          '$.acMod', coalesce(json_extract(`unit`.`value`, '$.acMod'), 0),
          '$.pdMod', coalesce(json_extract(`unit`.`value`, '$.pdMod'), 0),
          '$.mdMod', coalesce(json_extract(`unit`.`value`, '$.mdMod'), 0)
        ) ORDER BY `unit`.`key`
      )
      FROM json_each(`combats`.`document`, '$.units') AS `unit`
    )
  )
WHERE json_type(`document`, '$.units') = 'array';--> statement-breakpoint
UPDATE `action_log` SET
  `patch` = json_set(
    `patch`,
    '$.fields.units',
    (
      SELECT json_group_array(
        json_set(
          `unit`.`value`,
          '$.acMod', coalesce(json_extract(`unit`.`value`, '$.acMod'), 0),
          '$.pdMod', coalesce(json_extract(`unit`.`value`, '$.pdMod'), 0),
          '$.mdMod', coalesce(json_extract(`unit`.`value`, '$.mdMod'), 0)
        ) ORDER BY `unit`.`key`
      )
      FROM json_each(`action_log`.`patch`, '$.fields.units') AS `unit`
    )
  )
WHERE `patch` IS NOT NULL AND json_type(`patch`, '$.fields.units') = 'array';
