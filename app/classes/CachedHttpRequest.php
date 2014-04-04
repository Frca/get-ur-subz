<?php

class CachedHttpRequest {

    const MINUTE = 60;
    const HOUR = 3600;
    const DAY = 86400;
    const MONTH = 2592000;

    const LOADED_FROM_CACHE = 1;
    const DOWNLOADED = 2;
    const CURL_ERROR = 3;

    private $cacheStorage;
    private $result;
    private $status;

    public function __construct(SystemContainer $context, $url, $duration, $modify_data = '', $modify_curl = '')
    {
        $this->cacheStorage = new \Nette\Caching\Cache($context->cacheStorage, 'HttpRequests');
        $cacheString = $this->cacheStorage->load($url);
        $cacheData = $cacheString ? json_decode($cacheString) : NULL;
        if ($cacheData && $cacheData->expiration > time() ) {
            $this->result = $cacheData->data;
            $this->status = self::LOADED_FROM_CACHE;
        } else {
            $c = curl_init($url);
            curl_setopt($c, CURLOPT_RETURNTRANSFER, true);
            if ($modify_curl && is_callable($modify_curl))
                $modify_curl($c);
            $html = curl_exec($c);

            if (curl_error($c)) {
                $this->result = '';
                $this->status = self::CURL_ERROR;
            } else {
                $this->result = $modify_data && is_callable($modify_data) ? $modify_data($html) : $html;;
                $this->status = self::DOWNLOADED;

                $obj = new stdClass();
                $obj->data = $this->result;
                $obj->expiration = time() + $duration;
                $this->cacheStorage->save($url, json_encode($obj));
            }

            curl_close($c);
        }
    }

    public function getOutputResult()
    {
        if ($this->result != self::CURL_ERROR)
            return $this->result;
        else
            return false;
    }

    public static function load(SystemContainer $context, $url, $duration, $modify_data = '', $modify_curl = '')
    {
        $request = new self($context, $url, $duration, $modify_data, $modify_curl);
        return $request->getOutputResult();
    }
}