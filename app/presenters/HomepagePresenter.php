<?php

use Nette\Application\UI;

class HomepagePresenter extends BasePresenter
{
    public function handleData($showId, $season, $english)
    {
        $lang = $english ? "|1|" : "";
        $url = 'http://www.addic7ed.com/ajax_loadShow.php?show=' . $showId . '&season=' . $season . '&langs=' . $lang . '&hd=undefined&hi=undefined';
        $result = CachedHttpRequest::load($this->getContext(), $url, CachedHttpRequest::MINUTE);

        $this->payload->data = $result;

        $this->sendPayload();
    }

    public function handleGetSeasonCount($showId)
    {
        $url = 'http://www.addic7ed.com/show/' . $showId;
        $this->payload->seasons = CachedHttpRequest::load($this->getContext(), $url, 15 * CachedHttpRequest::MINUTE, function($result) {
            $start = strpos($result, '<div id="sl">');
            $end = strpos($result, "</div>", $start)+ 2* strlen("</div>") + 1;
            $output = substr($result, $start, $end - $start);

            $dom = new DOMDocument();
            $dom->loadHTML($output);
            $tags = $dom->getElementsByTagName("button");
            $seasons = array();
            foreach($tags as $tag)
                $seasons[] = $tag->nodeValue;

                return $seasons;
        });

        $this->sendPayload();
    }

    public function handleGetAllShows()
    {
        $url = 'http://www.addic7ed.com/ajax_getShows.php';
        $this->payload->shows = CachedHttpRequest::load($this->getContext(), $url, 30 * CachedHttpRequest::MINUTE, function($result) {
            $dom = new DOMDocument();
            @$dom->loadHTML($result);

            $tags = $dom->getElementsByTagName("option");
            $shows = array();
            foreach($tags as $tag) {
                $show = new stdClass();
                $show->value = $tag->getAttribute('value');
                if ($show->value == 0)
                    continue;

                $show->label = $tag->nodeValue;
                $shows[] = $show;
            }

            return $shows;
        });

        $this->sendPayload();
    }

    public function handleAddShow($showId, $title)
    {
        $this->payload->error = !$showId || !$title;
        if (!$this->payload->error) {
            $directory = ROOT_DIR . 'data/';
            if (!file_exists($directory)) {
                mkdir($directory, 0777, true);
            }

            $filename = $directory . 'navigator.data';
            $json = array();
            if (file_exists($filename)) {
                $content = file_get_contents($filename);
                $json = json_decode($content);
            }

            $exists = false;
            foreach($json as $existingShow) {
                if ($existingShow->value == $showId) {
                    $exists = true;
                    break;
                }
            }

            if ($exists) {
                $this->payload->status = "EXISTS";
            } else {
                $show = new stdClass();
                $show->value = $showId;
                $show->label = $title;
                $json[] = $show;

                // oredering
                usort($json, function($a, $b) {
                    return strcasecmp($a->label, $b->label);
                });

                file_put_contents($filename, json_encode($json));
                $this->payload->status = "OK";
            }
        }

        $this->sendPayload();
    }

    public function handleNavigatorData()
    {
        $this->payload->data = array();
        $filename = ROOT_DIR . 'data/navigator.data';
        if (file_exists($filename)) {
            $content = file_get_contents($filename);
            $this->payload->data = json_decode($content);
        }

        $this->sendPayload();
    }

    public function handleGetSubtitle($file, $name)
    {
        $url = 'http://www.addic7ed.com' . $file;
        $subData = CachedHttpRequest::load($this->getContext(), $url, 30 * CachedHttpRequest::MINUTE,
            function($result, $c) use ($name) {
                list($header, $body) = explode("\r\n\r\n", $result, 2);
                $headers = CachedHttpRequest::getHeaders($header);

                $data = new stdClass();
                $data->headers = array(
                    "Content-Disposition" => $headers["Content-Disposition"],
                    "Content-Type" => $headers["Content-Type"],
                );

                if ($name)
                    $data->headers["Content-Disposition"] = 'attachment; filename="' . $name . '"';
                $data->file = $body;

                return $data;
            }, function($c) {
                curl_setopt($c, CURLOPT_HEADER, 1);
                curl_setopt($c, CURLOPT_HTTPHEADER, array("Referer: http://www.addic7ed.com"));
            });

        $response = $this->getHttpResponse();

        foreach($subData->headers as $name => $value)
            $response->setHeader($name, $value);

        $this->sendResponse(new \Nette\Application\Responses\TextResponse($subData->file));
    }
}
