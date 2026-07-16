FROM liquibase/liquibase:4.29

COPY changelog /liquibase/changelog

ENTRYPOINT ["liquibase", "--changeLogFile=changelog/db.changelog-master.yaml"]
CMD ["update"]
