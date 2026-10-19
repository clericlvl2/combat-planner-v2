UPDATE `combats` SET `document` = json_set(`document`, '$.units', json((SELECT json_group_array(json(CASE WHEN json_type(u.value, '$.conditions') = 'array' THEN json_set(u.value, '$.conditions', json((SELECT json_group_array(CASE WHEN c.value = 'hindered' THEN 'hampered' ELSE c.value END) FROM json_each(u.value, '$.conditions') AS c WHERE c.value <> 'staggered'))) ELSE u.value END)) FROM json_each(`document`, '$.units') AS u)))
WHERE json_type(`document`, '$.units') = 'array';
--> statement-breakpoint
UPDATE `action_log` SET `patch` = json_set(`patch`, '$.fields.units', json((SELECT json_group_array(json(CASE WHEN json_type(u.value, '$.conditions') = 'array' THEN json_set(u.value, '$.conditions', json((SELECT json_group_array(CASE WHEN c.value = 'hindered' THEN 'hampered' ELSE c.value END) FROM json_each(u.value, '$.conditions') AS c WHERE c.value <> 'staggered'))) ELSE u.value END)) FROM json_each(`patch`, '$.fields.units') AS u)))
WHERE `patch` IS NOT NULL AND json_type(`patch`, '$.fields.units') = 'array';
--> statement-breakpoint
UPDATE `action_log` SET `patch` = json_set(`patch`, '$.units', json((SELECT json_group_object(p.key, json(CASE WHEN json_type(p.value) = 'object' THEN CASE WHEN json_type(p.value, '$.conditions') = 'array' THEN json_set(p.value, '$.conditions', json((SELECT json_group_array(CASE WHEN c.value = 'hindered' THEN 'hampered' ELSE c.value END) FROM json_each(p.value, '$.conditions') AS c WHERE c.value <> 'staggered'))) ELSE p.value END ELSE p.value END)) FROM json_each(`patch`, '$.units') AS p)))
WHERE `patch` IS NOT NULL AND json_type(`patch`, '$.units') = 'object';
--> statement-breakpoint
DELETE FROM `action_log` WHERE json_extract(`action`, '$.type') = 'toggleCondition' AND json_extract(`action`, '$.condition') = 'staggered';
--> statement-breakpoint
UPDATE `action_log` SET `action` = json_set(`action`, '$.condition', 'hampered') WHERE json_extract(`action`, '$.type') = 'toggleCondition' AND json_extract(`action`, '$.condition') = 'hindered';
