import React, { useEffect } from 'react'
import { useLoggerStore } from '../use-store-logger';
import { useLiveAPIContext } from '../live-api-context';

const LogListener = () => {
    const { log } = useLoggerStore();
    const { client } = useLiveAPIContext();

    useEffect(() => {
        client?.on('log', log);
        return () => {
            client?.off('log', log);
        }
    }, [client, log]);
  return null;
}

export default LogListener
