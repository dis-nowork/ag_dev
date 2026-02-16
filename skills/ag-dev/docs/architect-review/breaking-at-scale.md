# What Would Break at Scale?

1. **Memory Growth**: Terminal buffers + temporal graph edges accumulate
2. **SSE Connection Limits**: Broadcasting to 100+ clients would fail
3. **SuperSkills Execution**: No resource limits, could exhaust system
4. **State Synchronization**: Client/server state drift with many users
5. **File System**: Project context files could grow unbounded
6. **Database**: No persistence means all data lost on restart
