import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  const [category, setCategory] = useState('');
  const [eventName, setEventName] = useState('');
  const [chestNumber, setChestNumber] = useState('');
  const [displayResult, setDisplayResult] = useState(null);
  const [displayPoint, setDisplayPoint] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Leaderboard States
  const [leaderboard, setLeaderboard] = useState([]);
  const [publicLeaderboard, setPublicLeaderboard] = useState([]);
  const [leaderboardTitle, setLeaderboardTitle] = useState('');
  const [adminTitleInput, setAdminTitleInput] = useState('');

  const [showAdmin, setShowAdmin] = useState(false);
  const [isLeaderboardVisible, setIsLeaderboardVisible] = useState(true);

  const [allStudents, setAllStudents] = useState([]);
  const [allParticipants, setAllParticipants] = useState([]);
  const [allResults, setAllResults] = useState([]);

  const [categorizedEvents, setCategorizedEvents] = useState({
    "I'dadiyya": [],
    "Ibtida'iyya": [],
    Muthawassita: [],
    Aaliya: [],
  });

  const [bulkData, setBulkData] = useState('');
  const [bulkEventCat, setBulkEventCat] = useState("I'dadiyya");
  const [bulkEventsData, setBulkEventsData] = useState('');

  const [resCat, setResCat] = useState("I'dadiyya");
  const [resEvent, setResEvent] = useState('');
  const [resNumber, setResNumber] = useState('');
  const [isGroupEvent, setIsGroupEvent] = useState(false);

  // Edit State & Search
  const [isEditing, setIsEditing] = useState(false);
  const [editingResultId, setEditingResultId] = useState(null);
  const [originalEditEvent, setOriginalEditEvent] = useState('');
  const [resultSearchTerm, setResultSearchTerm] = useState('');

  const [firstWinners, setFirstWinners] = useState([{ chest: '', points: 5 }]);
  const [secondWinners, setSecondWinners] = useState([
    { chest: '', points: 3 },
  ]);
  const [thirdWinners, setThirdWinners] = useState([{ chest: '', points: 1 }]);
  const [otherParticipants, setOtherParticipants] = useState([]);

  const [topStudentsCat, setTopStudentsCat] = useState("I'dadiyya");
  const [expandedTopStudent, setExpandedTopStudent] = useState(null);

  // Custom Points States
  const [customTeam, setCustomTeam] = useState('');
  const [customPoints, setCustomPoints] = useState('');
  const [customReason, setCustomReason] = useState('');

  const fetchData = async () => {
    try {
      const evtSnap = await getDocs(collection(db, 'events'));
      const eventsObj = {
        "I'dadiyya": [],
        "Ibtida'iyya": [],
        Muthawassita: [],
        Aaliya: [],
      };
      evtSnap.forEach((d) => {
        const data = d.data();
        if (eventsObj[data.category])
          eventsObj[data.category].push(data.eventName);
      });
      setCategorizedEvents(eventsObj);

      const stuSnap = await getDocs(collection(db, 'students'));
      const studentsData = [];
      stuSnap.forEach((d) => studentsData.push(d.data()));
      setAllStudents(studentsData);

      const querySnapshot = await getDocs(collection(db, 'participants'));
      const teams = {};
      const pData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        pData.push(data);
        teams[data.team] = (teams[data.team] || 0) + Number(data.points);
      });
      setAllParticipants(pData);

      const sorted = Object.keys(teams)
        .map((t) => ({ team: t, score: teams[t] }))
        .sort((a, b) => b.score - a.score);
      setLeaderboard(sorted);

      // Fetch all results and sort by Result Number
      const resSnap = await getDocs(collection(db, 'results'));
      const resultsData = [];
      resSnap.forEach((d) => resultsData.push({ id: d.id, ...d.data() }));

      resultsData.sort((a, b) => {
        const numA = parseInt(a.resultNumber) || 999999;
        const numB = parseInt(b.resultNumber) || 999999;
        if (numA !== numB) return numA - numB;
        return a.event.localeCompare(b.event);
      });
      setAllResults(resultsData);
    } catch (e) {
      console.log('Error fetching data:', e);
    }
  };

  useEffect(() => {
    fetchData();
    const unsub = onSnapshot(doc(db, 'settings', 'config'), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setIsLeaderboardVisible(data.showLeaderboard);
        setPublicLeaderboard(data.publishedScores || []);
        setLeaderboardTitle(data.leaderboardTitle || '');
        setAdminTitleInput((prev) => prev || data.leaderboardTitle || '');
      } else {
        setDoc(doc(db, 'settings', 'config'), {
          showLeaderboard: true,
          publishedScores: [],
          leaderboardTitle: '',
        });
      }
    });
    return () => unsub();
  }, []);

  const filteredResults = allResults.filter(
    (r) =>
      r.event.toLowerCase().includes(resultSearchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(resultSearchTerm.toLowerCase()) ||
      (r.resultNumber && r.resultNumber.toString().includes(resultSearchTerm))
  );

  const uniqueStudents = Array.from(
    new Map(allStudents.map((s) => [s.chestNumber, s])).values()
  );
  const uniqueTeams = Array.from(
    new Set(allStudents.map((s) => s.team).filter(Boolean))
  );

  const topIndividualScorers = uniqueStudents
    .filter((s) => s.category === topStudentsCat)
    .map((s) => {
      let totalPoints = 0;
      let details = [];
      allParticipants.forEach((p) => {
        if (p.chestNumber === s.chestNumber) {
          if (p.isGroup) {
            details.push({
              event: p.event || 'Group Event',
              points: p.points,
              isGroup: true,
            });
          } else {
            totalPoints += Number(p.points);
            details.push({
              event: p.event || 'Individual Event',
              points: p.points,
              isGroup: false,
            });
          }
        }
      });
      return { ...s, totalPoints, details };
    })
    .filter((s) => s.totalPoints > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 3);

  const handleAdminLogin = () => {
    if (showAdmin) {
      setShowAdmin(false);
      return;
    }
    const password = window.prompt('Enter Admin Password:');
    if (password === 'jan2027') {
      setShowAdmin(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (password !== null) {
      alert('Incorrect Password! ❌');
    }
  };

  const handlePublishLeaderboard = async () => {
    const pass = window.prompt('Enter Admin Password to confirm publishing:');
    if (pass !== 'jan2027') return alert('Incorrect Password! ❌');
    try {
      await setDoc(
        doc(db, 'settings', 'config'),
        {
          showLeaderboard: isLeaderboardVisible,
          publishedScores: leaderboard,
          leaderboardTitle: adminTitleInput,
        },
        { merge: true }
      );
      alert(
        'Public Leaderboard Updated Successfully! ✅\nNow everyone can see the latest points.'
      );
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleClearPointsOnly = async () => {
    const confirmDelete = window.confirm(
      '⚠️ Warning! Are you sure you want to delete ONLY the results and points? (Students and events will NOT be deleted)'
    );
    if (!confirmDelete) return;
    const pass = window.prompt('Enter Admin Password to confirm deletion:');
    if (pass !== 'jan2027')
      return alert('Incorrect Password! Deletion cancelled. ❌');

    try {
      const collections = ['results', 'participants'];
      for (const col of collections) {
        const snap = await getDocs(collection(db, col));
        const deletePromises = snap.docs.map((d) =>
          deleteDoc(doc(db, col, d.id))
        );
        await Promise.all(deletePromises);
      }
      await setDoc(
        doc(db, 'settings', 'config'),
        {
          showLeaderboard: isLeaderboardVisible,
          publishedScores: [],
          leaderboardTitle: '',
        },
        { merge: true }
      );
      alert('Results and points have been successfully deleted!');
      setLeaderboard([]);
      setPublicLeaderboard([]);
      setAllParticipants([]);
      setAllResults([]);
      setDisplayResult(null);
      setDisplayPoint(null);
      fetchData();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleResetDatabase = async () => {
    const confirmDelete = window.confirm(
      '⚠️ Warning! Are you sure you want to delete ALL data including students and events?'
    );
    if (!confirmDelete) return;
    const pass = window.prompt(
      'Enter Admin Password to confirm complete deletion:'
    );
    if (pass !== 'jan2027')
      return alert('Incorrect Password! Deletion cancelled. ❌');

    try {
      const collections = ['students', 'results', 'participants', 'events'];
      for (const col of collections) {
        const snap = await getDocs(collection(db, col));
        const deletePromises = snap.docs.map((d) =>
          deleteDoc(doc(db, col, d.id))
        );
        await Promise.all(deletePromises);
      }
      await setDoc(
        doc(db, 'settings', 'config'),
        {
          showLeaderboard: isLeaderboardVisible,
          publishedScores: [],
          leaderboardTitle: '',
        },
        { merge: true }
      );
      alert('All data has been successfully deleted!');
      setAllStudents([]);
      setLeaderboard([]);
      setPublicLeaderboard([]);
      setAllParticipants([]);
      setAllResults([]);
      setDisplayResult(null);
      setDisplayPoint(null);
      fetchData();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleClearEvents = async () => {
    if (
      !window.confirm(
        '⚠️ Are you sure you want to delete all previously added events?'
      )
    )
      return;
    const pass = window.prompt('Enter Admin Password to confirm deletion:');
    if (pass !== 'jan2027')
      return alert('Incorrect Password! Deletion cancelled. ❌');

    try {
      const snap = await getDocs(collection(db, 'events'));
      await Promise.all(
        snap.docs.map((d) => deleteDoc(doc(db, 'events', d.id)))
      );
      alert('All events have been deleted!');
      fetchData();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleBulkAddEvents = async () => {
    if (!bulkEventsData.trim()) return alert('Please enter event names!');
    try {
      const lines = bulkEventsData.split(/[\n,]+/);
      const addPromises = [];
      let count = 0;
      for (let line of lines) {
        const eName = line.trim();
        if (eName === '') continue;
        addPromises.push(
          addDoc(collection(db, 'events'), {
            category: bulkEventCat,
            eventName: eName,
          })
        );
        count++;
      }
      await Promise.all(addPromises);
      alert(`${count} events added successfully!`);
      setBulkEventsData('');
      fetchData();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleBulkRegister = async () => {
    if (!bulkData.trim()) return alert('Please enter student details!');
    try {
      const lines = bulkData.split('\n');
      const addPromises = [];
      for (let line of lines) {
        const parts = line.split(',');
        if (parts.length >= 4) {
          addPromises.push(
            addDoc(collection(db, 'students'), {
              chestNumber: parts[0].trim(),
              name: parts[1].trim(),
              category: parts[2].trim(),
              team: parts[3].trim(),
            })
          );
        }
      }
      await Promise.all(addPromises);
      alert(`Students successfully registered!`);
      setBulkData('');
      fetchData();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleResultSearch = async () => {
    try {
      const q = query(
        collection(db, 'results'),
        where('category', '==', category),
        where('event', '==', eventName)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) setDisplayResult(querySnapshot.docs[0].data());
      else setDisplayResult('Not Found');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handlePointSearch = async (searchNumber = chestNumber) => {
    try {
      const q = query(
        collection(db, 'participants'),
        where('chestNumber', '==', searchNumber)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        let totalPoints = 0;
        let studentName = '';
        let studentTeam = '';
        let details = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          studentName = data.name;
          studentTeam = data.team;
          if (data.isGroup) {
            details.push({
              event: data.event || 'Group Event',
              points: data.points,
              isGroup: true,
            });
          } else {
            totalPoints += Number(data.points);
            details.push({
              event: data.event || 'Individual Event',
              points: data.points,
              isGroup: false,
            });
          }
        });

        const stuInfo = uniqueStudents.find(
          (s) => s.chestNumber === searchNumber
        );
        const stuCat = stuInfo ? stuInfo.category : '';
        setDisplayPoint({
          name: studentName,
          team: studentTeam,
          category: stuCat,
          points: totalPoints,
          details,
        });
      } else setDisplayPoint('Not Found');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleAddCustomPoints = async () => {
    if (!customTeam || !customPoints)
      return alert('Please select a team and enter points.');
    const pass = window.prompt('Enter Admin Password to confirm:');
    if (pass !== 'jan2027') return alert('Incorrect Password! ❌');
    try {
      await addDoc(collection(db, 'participants'), {
        chestNumber: '',
        name: 'Custom / Team Points',
        team: customTeam,
        category: 'Custom',
        points: Number(customPoints),
        event: customReason || 'Custom Bonus',
        isGroup: true,
      });
      alert(`Successfully added ${customPoints} points to ${customTeam}!`);
      setCustomTeam('');
      setCustomPoints('');
      setCustomReason('');
      fetchData();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  // --- EDIT RESULT LOGIC ---
  const resetAddForm = () => {
    setIsEditing(false);
    setEditingResultId(null);
    setOriginalEditEvent('');
    setResEvent('');
    setResNumber('');
    setIsGroupEvent(false);
    setFirstWinners([{ chest: '', points: 5 }]);
    setSecondWinners([{ chest: '', points: 3 }]);
    setThirdWinners([{ chest: '', points: 1 }]);
    setOtherParticipants([]);
  };

  const handleEditClick = async (res) => {
    setIsEditing(true);
    setEditingResultId(res.id);
    setOriginalEditEvent(res.event);
    setResCat(res.category);
    setResEvent(res.event);
    setResNumber(res.resultNumber || '');
    setIsGroupEvent(res.isGroupEvent || false);

    if (res.rawWinners) {
      setFirstWinners(
        res.rawWinners.first?.length > 0
          ? res.rawWinners.first
          : [{ chest: '', points: 5 }]
      );
      setSecondWinners(
        res.rawWinners.second?.length > 0
          ? res.rawWinners.second
          : [{ chest: '', points: 3 }]
      );
      setThirdWinners(
        res.rawWinners.third?.length > 0
          ? res.rawWinners.third
          : [{ chest: '', points: 1 }]
      );
      setOtherParticipants(res.rawWinners.others || []);
    } else {
      // SMART FALLBACK WITH EXACT CATEGORY MATCHING TO PREVENT MIX-UPS
      const pQuery = query(
        collection(db, 'participants'),
        where('event', '==', res.event)
      );
      const pSnap = await getDocs(pQuery);
      let loaded = [];

      pSnap.forEach((d) => {
        const data = d.data();
        if (data.name !== 'Custom / Team Points') {
          // Strictly check the student's category against the result category
          const studentInfo = allStudents.find(
            (st) => st.chestNumber === data.chestNumber
          );
          if (
            data.category === res.category ||
            (studentInfo && studentInfo.category === res.category)
          ) {
            loaded.push({
              chest: data.chestNumber,
              points: Number(data.points),
            });
          }
        }
      });

      // Sort highest points first
      loaded.sort((a, b) => b.points - a.points);

      let f = [],
        s = [],
        t = [],
        o = [];
      const distinctPoints = [...new Set(loaded.map((x) => x.points))];

      if (distinctPoints.length > 0)
        f = loaded.filter((x) => x.points === distinctPoints[0]);
      if (distinctPoints.length > 1)
        s = loaded.filter((x) => x.points === distinctPoints[1]);
      if (distinctPoints.length > 2)
        t = loaded.filter((x) => x.points === distinctPoints[2]);
      if (distinctPoints.length > 3)
        o = loaded.filter(
          (x) => !f.includes(x) && !s.includes(x) && !t.includes(x)
        );

      setFirstWinners(f.length > 0 ? f : [{ chest: '', points: 5 }]);
      setSecondWinners(s.length > 0 ? s : [{ chest: '', points: 3 }]);
      setThirdWinners(t.length > 0 ? t : [{ chest: '', points: 1 }]);
      setOtherParticipants(o);
    }

    const el = document.getElementById('add-result-form');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteResult = async () => {
    const pass = window.prompt('Enter Admin Password to delete this result:');
    if (pass !== 'jan2027') return alert('Incorrect Password! ❌');

    try {
      await deleteDoc(doc(db, 'results', editingResultId));

      const pQuery = query(
        collection(db, 'participants'),
        where('event', '==', originalEditEvent)
      );
      const pSnap = await getDocs(pQuery);
      const deletePromises = [];
      pSnap.forEach((d) => {
        const data = d.data();
        // Strictly check category before deleting so we don't accidentally delete another category's points
        const studentInfo = allStudents.find(
          (st) => st.chestNumber === data.chestNumber
        );
        if (
          data.category === resCat ||
          (studentInfo && studentInfo.category === resCat)
        ) {
          deletePromises.push(deleteDoc(doc(db, 'participants', d.id)));
        }
      });
      await Promise.all(deletePromises);

      alert('Result and points deleted successfully! 🗑️');
      resetAddForm();
      fetchData();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const updateWinner = (place, index, field, value) => {
    let newW;
    if (place === 1) {
      newW = [...firstWinners];
      newW[index][field] = value;
      setFirstWinners(newW);
    }
    if (place === 2) {
      newW = [...secondWinners];
      newW[index][field] = value;
      setSecondWinners(newW);
    }
    if (place === 3) {
      newW = [...thirdWinners];
      newW[index][field] = value;
      setThirdWinners(newW);
    }
    if (place === 4) {
      newW = [...otherParticipants];
      newW[index][field] = value;
      setOtherParticipants(newW);
    }
  };

  const addWinnerRow = (place) => {
    if (place === 1)
      setFirstWinners([...firstWinners, { chest: '', points: 5 }]);
    if (place === 2)
      setSecondWinners([...secondWinners, { chest: '', points: 3 }]);
    if (place === 3)
      setThirdWinners([...thirdWinners, { chest: '', points: 1 }]);
    if (place === 4)
      setOtherParticipants([...otherParticipants, { chest: '', points: 1 }]);
  };

  const removeWinnerRow = (place, index) => {
    if (place === 1) {
      const newW = [...firstWinners];
      newW.splice(index, 1);
      setFirstWinners(newW);
    }
    if (place === 2) {
      const newW = [...secondWinners];
      newW.splice(index, 1);
      setSecondWinners(newW);
    }
    if (place === 3) {
      const newW = [...thirdWinners];
      newW.splice(index, 1);
      setThirdWinners(newW);
    }
    if (place === 4) {
      const newW = [...otherParticipants];
      newW.splice(index, 1);
      setOtherParticipants(newW);
    }
  };

  const formatResultString = (winnersArray) => {
    return winnersArray
      .filter((w) => w.chest.trim() !== '')
      .map((w) => {
        const student = allStudents.find((s) => s.chestNumber === w.chest);
        return student
          ? `${w.chest} - ${student.name} (${student.team})`
          : w.chest;
      })
      .join(', ');
  };

  const handleAddResult = async () => {
    const firstStr = formatResultString(firstWinners);
    const secondStr = formatResultString(secondWinners);
    const thirdStr = formatResultString(thirdWinners);

    if (!resEvent || !firstStr)
      return alert('Please provide complete details! 1st place is mandatory.');

    const allEntries = [
      ...firstWinners,
      ...secondWinners,
      ...thirdWinners,
      ...otherParticipants,
    ].filter((w) => w.chest.trim() !== '');
    const invalidEntries = allEntries.filter(
      (w) => !allStudents.find((s) => s.chestNumber === w.chest)
    );
    if (invalidEntries.length > 0) {
      return alert(
        `Invalid Chest Numbers (Not registered): ${invalidEntries
          .map((w) => w.chest)
          .join(', ')}`
      );
    }

    try {
      if (isEditing && editingResultId) {
        await deleteDoc(doc(db, 'results', editingResultId));

        const pQuery = query(
          collection(db, 'participants'),
          where('event', '==', originalEditEvent)
        );
        const pSnap = await getDocs(pQuery);
        const deletePromises = [];
        pSnap.forEach((d) => {
          const data = d.data();
          const studentInfo = allStudents.find(
            (st) => st.chestNumber === data.chestNumber
          );
          if (
            data.category === resCat ||
            (studentInfo && studentInfo.category === resCat)
          ) {
            deletePromises.push(deleteDoc(doc(db, 'participants', d.id)));
          }
        });
        await Promise.all(deletePromises);
      }

      await addDoc(collection(db, 'results'), {
        category: resCat,
        event: resEvent,
        resultNumber: resNumber,
        first: firstStr,
        second: secondStr,
        third: thirdStr,
        isGroupEvent: isGroupEvent,
        rawWinners: {
          first: firstWinners.filter((w) => w.chest.trim() !== ''),
          second: secondWinners.filter((w) => w.chest.trim() !== ''),
          third: thirdWinners.filter((w) => w.chest.trim() !== ''),
          others: otherParticipants.filter((w) => w.chest.trim() !== ''),
        },
      });

      const pointPromises = allEntries.map((w) => {
        const student = allStudents.find((s) => s.chestNumber === w.chest);
        return addDoc(collection(db, 'participants'), {
          chestNumber: w.chest,
          name: student.name,
          team: student.team,
          category: resCat,
          points: Number(w.points),
          event: resEvent,
          isGroup: isGroupEvent,
        });
      });
      await Promise.all(pointPromises);

      alert(
        isEditing
          ? 'Result and points UPDATED successfully! ✅'
          : "Result and points SAVED successfully! ✅\n(Note: Public leaderboard will not update until you click 'Publish Live Scores')"
      );

      resetAddForm();
      fetchData();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  // --- DYNAMIC THEME STYLES ---
  const theme = {
    bg: isDarkMode ? '#121212' : '#f4f7f6',
    text: isDarkMode ? '#e0e0e0' : '#333',
    cardBg: isDarkMode ? '#1e1e1e' : '#ffffff',
    cardBorder: isDarkMode ? '#333' : '#f0f0f0',
    inputBg: isDarkMode ? '#2c2c2c' : '#fcfcfc',
    inputBorder: isDarkMode ? '#444' : '#dcdcdc',
    resultBg: isDarkMode ? '#1a252f' : '#f0f8ff',
    resultBorder: isDarkMode ? '#2c3e50' : '#cce5ff',
    pointBg: isDarkMode ? '#142b23' : '#e8f8f5',
    pointBorder: isDarkMode ? '#1e4d3b' : '#b2dfdb',
    goldBg: isDarkMode ? '#332200' : '#fffcf0',
    listBg: isDarkMode ? '#2a2a2a' : '#ffffff',
    listBorder: isDarkMode ? '#444' : '#e0e0e0',
  };

  const cardStyle = {
    backgroundColor: theme.cardBg,
    padding: '25px',
    margin: '20px auto',
    maxWidth: '450px',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
    border: `1px solid ${theme.cardBorder}`,
    color: theme.text,
    transition: 'all 0.3s ease',
  };
  const inputStyle = {
    padding: '12px',
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: '8px',
    border: `1px solid ${theme.inputBorder}`,
    fontSize: '15px',
    backgroundColor: theme.inputBg,
    color: theme.text,
    transition: 'all 0.3s ease',
  };
  const btnStyle = {
    padding: '12px 20px',
    width: '100%',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
    transition: 'transform 0.2s ease',
  };

  return (
    <div
      style={{
        backgroundColor: theme.bg,
        minHeight: '100vh',
        padding: '20px 10px',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: theme.text,
        colorScheme: isDarkMode ? 'dark' : 'light',
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
          }}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <datalist id="search-event-list">
        {category &&
          categorizedEvents[category]?.map((evt, idx) => (
            <option key={idx} value={evt} />
          ))}
      </datalist>
      <datalist id="admin-event-list">
        {resCat &&
          categorizedEvents[resCat]?.map((evt, idx) => (
            <option key={idx} value={evt} />
          ))}
      </datalist>

      <div
        style={{ textAlign: 'center', marginBottom: '30px', marginTop: '20px' }}
      >
        <h1
          style={{
            color: isDarkMode ? '#fff' : '#2c3e50',
            fontSize: '28px',
            margin: '10px 0',
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
          }}
        >
          Mahrajan Results Portal <span style={{ fontSize: '32px' }}>🏆</span>
        </h1>
        <p
          style={{
            color: isDarkMode ? '#aaa' : '#7f8c8d',
            fontSize: '14px',
            margin: 0,
          }}
        >
          Live Scoring & Event Updates
        </p>
      </div>

      {!showAdmin && (
        <>
          <div style={{ ...cardStyle, borderTop: '5px solid #f1c40f' }}>
            <h2
              style={{
                textAlign: 'center',
                color: isDarkMode ? '#ddd' : '#34495e',
                marginTop: 0,
              }}
            >
              Team Leaderboard 📊
            </h2>

            {leaderboardTitle && isLeaderboardVisible && (
              <p
                style={{
                  textAlign: 'center',
                  color: '#d35400',
                  fontWeight: 'bold',
                  fontSize: '15px',
                  margin: '5px 0',
                  backgroundColor: isDarkMode ? '#3d1c00' : '#fdf2e9',
                  padding: '8px',
                  borderRadius: '8px',
                }}
              >
                {leaderboardTitle}
              </p>
            )}

            {isLeaderboardVisible ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  marginTop: '15px',
                }}
              >
                {publicLeaderboard.length === 0 ? (
                  <p
                    style={{
                      textAlign: 'center',
                      color: '#999',
                      fontWeight: 'bold',
                    }}
                  >
                    Result Coming Soon
                  </p>
                ) : (
                  publicLeaderboard.map((team, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '15px',
                        backgroundColor:
                          index === 0 ? theme.goldBg : theme.listBg,
                        border:
                          index === 0
                            ? '2px solid #f1c40f'
                            : `1px solid ${theme.listBorder}`,
                        borderRadius: '10px',
                        boxShadow:
                          index === 0
                            ? '0 4px 10px rgba(241, 196, 15, 0.2)'
                            : 'none',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '18px',
                          fontWeight: index === 0 ? '800' : '600',
                          color: index === 0 ? '#d35400' : theme.text,
                        }}
                      >
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}{' '}
                        {team.team}
                      </span>
                      <span
                        style={{
                          fontSize: '20px',
                          fontWeight: 'bold',
                          color: '#27ae60',
                          backgroundColor: theme.pointBg,
                          padding: '5px 12px',
                          borderRadius: '20px',
                        }}
                      >
                        {team.score}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div
                style={{
                  marginTop: '20px',
                  padding: '20px',
                  backgroundColor: isDarkMode ? '#2a0a0a' : '#fdfefe',
                  border: '2px dashed #e74c3c',
                  borderRadius: '10px',
                  color: '#e74c3c',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '30px',
                    display: 'block',
                    marginBottom: '10px',
                  }}
                >
                  🔒
                </span>
                Result Coming Soon
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <h2
              style={{
                textAlign: 'center',
                color: isDarkMode ? '#ddd' : '#34495e',
                marginTop: 0,
              }}
            >
              Check Results 🏅
            </h2>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setEventName('');
              }}
              style={{ ...inputStyle, marginBottom: '15px' }}
            >
              <option value="">-- Select Category --</option>
              <option value="I'dadiyya">I'dadiyya</option>
              <option value="Ibtida'iyya">Ibtida'iyya</option>
              <option value="Muthawassita">Muthawassita</option>
              <option value="Aaliya">Aaliya</option>
            </select>
            <input
              list="search-event-list"
              type="text"
              placeholder="Search & Select Event"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              disabled={!category}
              style={{ ...inputStyle, marginBottom: '15px' }}
            />
            <button
              onClick={handleResultSearch}
              style={{
                ...btnStyle,
                backgroundColor: '#2980b9',
                marginBottom: '15px',
              }}
            >
              🔍 Search Result
            </button>

            {displayResult === 'Not Found' && (
              <p
                style={{
                  color: '#e74c3c',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  backgroundColor: isDarkMode ? '#3d1010' : '#fdecef',
                  padding: '10px',
                  borderRadius: '8px',
                }}
              >
                Result Coming Soon
              </p>
            )}
            {displayResult !== null && displayResult !== 'Not Found' && (
              <div
                style={{
                  textAlign: 'left',
                  backgroundColor: theme.resultBg,
                  padding: '20px',
                  borderRadius: '10px',
                  marginTop: '15px',
                  border: `1px solid ${theme.resultBorder}`,
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    color: isDarkMode ? '#4da3ff' : '#0056b3',
                    fontSize: '18px',
                    borderBottom: `1px solid ${theme.resultBorder}`,
                    paddingBottom: '10px',
                  }}
                >
                  {displayResult.resultNumber && (
                    <span
                      style={{
                        backgroundColor: '#e67e22',
                        color: 'white',
                        padding: '3px 8px',
                        borderRadius: '5px',
                        fontSize: '11px',
                        marginRight: '10px',
                        verticalAlign: 'middle',
                      }}
                    >
                      RESULT NO: {displayResult.resultNumber}
                    </span>
                  )}
                  {displayResult.event}{' '}
                  {displayResult.isGroupEvent && (
                    <span style={{ fontSize: '12px', color: '#e67e22' }}>
                      (Group Event)
                    </span>
                  )}
                </h3>
                <p
                  style={{
                    fontSize: '15px',
                    margin: '12px 0',
                    lineHeight: '1.5',
                  }}
                >
                  🥇 1st:
                  <br />
                  <b style={{ color: '#d35400' }}>{displayResult.first}</b>
                </p>
                {displayResult.second && (
                  <p
                    style={{
                      fontSize: '15px',
                      margin: '12px 0',
                      lineHeight: '1.5',
                    }}
                  >
                    🥈 2nd:
                    <br />
                    <b>{displayResult.second}</b>
                  </p>
                )}
                {displayResult.third && (
                  <p
                    style={{
                      fontSize: '15px',
                      margin: '12px 0',
                      lineHeight: '1.5',
                    }}
                  >
                    🥉 3rd:
                    <br />
                    <b style={{ color: isDarkMode ? '#bbb' : '#555' }}>
                      {displayResult.third}
                    </b>
                  </p>
                )}
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <h2
              style={{
                textAlign: 'center',
                color: isDarkMode ? '#ddd' : '#34495e',
                marginTop: 0,
              }}
            >
              Student Point Search 👤
            </h2>
            <button
              onClick={() => setShowScanner(!showScanner)}
              style={{
                ...btnStyle,
                backgroundColor: '#8e44ad',
                marginBottom: '15px',
              }}
            >
              {showScanner ? 'Close Scanner ❌' : 'Scan QR Code 📷'}
            </button>
            {showScanner && (
              <div
                style={{
                  marginBottom: '15px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '2px solid #8e44ad',
                }}
              >
                <Scanner
                  onResult={(text) => {
                    setChestNumber(text);
                    setShowScanner(false);
                    handlePointSearch(text);
                  }}
                  onError={(error) => console.log(error?.message)}
                />
              </div>
            )}
            <input
              type="text"
              placeholder="Enter Chest Number (eg: 101)"
              value={chestNumber}
              onChange={(e) => setChestNumber(e.target.value)}
              style={{ ...inputStyle, marginBottom: '15px' }}
            />
            <button
              onClick={() => handlePointSearch(chestNumber)}
              style={{
                ...btnStyle,
                backgroundColor: '#27ae60',
                marginBottom: '15px',
              }}
            >
              View Points
            </button>

            {displayPoint === 'Not Found' && (
              <p
                style={{
                  color: '#e74c3c',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  backgroundColor: isDarkMode ? '#3d1010' : '#fdecef',
                  padding: '10px',
                  borderRadius: '8px',
                }}
              >
                Chest number not found
              </p>
            )}
            {displayPoint !== null && displayPoint !== 'Not Found' && (
              <div
                style={{
                  textAlign: 'center',
                  backgroundColor: theme.pointBg,
                  padding: '20px',
                  borderRadius: '10px',
                  marginTop: '15px',
                  border: `1px solid ${theme.pointBorder}`,
                }}
              >
                <p
                  style={{
                    fontSize: '18px',
                    margin: '5px 0',
                    color: isDarkMode ? '#fff' : '#2c3e50',
                  }}
                >
                  <b>{displayPoint.name}</b>
                </p>
                <p
                  style={{
                    fontSize: '14px',
                    margin: '5px 0',
                    color: isDarkMode ? '#aaa' : '#7f8c8d',
                  }}
                >
                  {displayPoint.team}
                </p>
                {displayPoint.category && (
                  <p
                    style={{
                      fontSize: '12px',
                      margin: '0 0 5px 0',
                      color: '#e67e22',
                      fontWeight: 'bold',
                    }}
                  >
                    Category: {displayPoint.category}
                  </p>
                )}

                <div
                  style={{
                    marginTop: '15px',
                    textAlign: 'left',
                    backgroundColor: theme.cardBg,
                    padding: '15px',
                    borderRadius: '8px',
                    border: `1px solid ${theme.cardBorder}`,
                  }}
                >
                  <h4
                    style={{
                      margin: '0 0 10px 0',
                      color: isDarkMode ? '#ddd' : '#2c3e50',
                    }}
                  >
                    Point Details:
                  </h4>
                  {displayPoint.details.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#999' }}>
                      No events found.
                    </p>
                  ) : (
                    displayPoint.details.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '14px',
                          padding: '5px 0',
                          borderBottom: `1px solid ${
                            isDarkMode ? '#444' : '#eee'
                          }`,
                        }}
                      >
                        <span>
                          {item.event}{' '}
                          {item.isGroup && (
                            <span
                              style={{ fontSize: '11px', color: '#e67e22' }}
                            >
                              (Group)
                            </span>
                          )}
                        </span>
                        <span
                          style={{
                            fontWeight: 'bold',
                            color: item.isGroup ? '#999' : '#27ae60',
                          }}
                        >
                          {item.isGroup ? 'Team Only' : `+${item.points}`}
                        </span>
                      </div>
                    ))
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '16px',
                      paddingTop: '10px',
                      marginTop: '5px',
                      borderTop: '2px solid #27ae60',
                      fontWeight: 'bold',
                    }}
                  >
                    <span>Total Points:</span>
                    <span style={{ color: '#27ae60' }}>
                      {displayPoint.points}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {showAdmin && (
        <div style={{ ...cardStyle, border: '3px dashed #e74c3c' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ color: '#c0392b', margin: 0 }}>⚙️ Admin Panel</h2>
            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={handleClearPointsOnly}
                style={{
                  backgroundColor: '#e67e22',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                Reset Points Only
              </button>
              <button
                onClick={handleResetDatabase}
                style={{
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                Clear ALL Data
              </button>
              <button
                onClick={() => setShowAdmin(false)}
                style={{
                  backgroundColor: '#7f8c8d',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                Close ❌
              </button>
            </div>
          </div>

          <div
            style={{
              margin: '20px 0',
              paddingBottom: '20px',
              borderBottom: `1px solid ${isDarkMode ? '#444' : '#eee'}`,
            }}
          >
            <h3 style={{ color: isDarkMode ? '#ddd' : '#2c3e50' }}>
              🔒 Leaderboard Control (Suspense)
            </h3>
            <div
              style={{
                marginBottom: '15px',
                backgroundColor: theme.pointBg,
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #27ae60',
              }}
            >
              <p
                style={{
                  margin: '0 0 10px 0',
                  fontWeight: 'bold',
                  color: '#27ae60',
                }}
              >
                Update Public Leaderboard:
              </p>
              <p
                style={{
                  fontSize: '11px',
                  color: isDarkMode ? '#aaa' : '#555',
                  marginTop: 0,
                  marginBottom: '10px',
                }}
              >
                Live scores are hidden from the public until you press Publish.
              </p>
              <input
                type="text"
                placeholder="Title (eg: After 10 Results...)"
                value={adminTitleInput}
                onChange={(e) => setAdminTitleInput(e.target.value)}
                style={{ ...inputStyle, marginBottom: '10px' }}
              />
              <button
                onClick={handlePublishLeaderboard}
                style={{
                  ...btnStyle,
                  backgroundColor: '#27ae60',
                  color: '#fff',
                  marginBottom: '10px',
                }}
              >
                🚀 Publish Live Scores to Public
              </button>
              <button
                onClick={async () =>
                  await setDoc(
                    doc(db, 'settings', 'config'),
                    { showLeaderboard: !isLeaderboardVisible },
                    { merge: true }
                  )
                }
                style={{
                  ...btnStyle,
                  backgroundColor: isLeaderboardVisible ? '#f39c12' : '#8e44ad',
                  color: '#fff',
                }}
              >
                {isLeaderboardVisible
                  ? 'Hide Entire Leaderboard 🙈'
                  : 'Show Published Leaderboard 👁️'}
              </button>
            </div>

            <div
              style={{
                marginTop: '15px',
                backgroundColor: theme.cardBg,
                padding: '15px',
                borderRadius: '8px',
                border: '2px dashed #c0392b',
              }}
            >
              <p
                style={{
                  margin: '0 0 10px 0',
                  fontWeight: 'bold',
                  color: '#c0392b',
                }}
              >
                Live Admin View (Hidden from Public):
              </p>
              {leaderboard.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#999' }}>
                  No points yet.
                </p>
              ) : (
                leaderboard.map((team, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '15px',
                      borderBottom: `1px solid ${isDarkMode ? '#444' : '#ddd'}`,
                      padding: '8px 0',
                    }}
                  >
                    <span>
                      {index + 1}. {team.team}
                    </span>
                    <span style={{ fontWeight: 'bold', color: '#c0392b' }}>
                      {team.score} Pts
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            style={{
              margin: '20px 0',
              paddingBottom: '20px',
              borderBottom: `1px solid ${isDarkMode ? '#444' : '#eee'}`,
            }}
          >
            <h3 style={{ color: isDarkMode ? '#ddd' : '#2c3e50' }}>
              🌟 Custom Team Points
            </h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={customTeam}
                onChange={(e) => setCustomTeam(e.target.value)}
                style={{ ...inputStyle, width: '100%', marginBottom: 0 }}
              >
                <option value="">-- Select Team --</option>
                {uniqueTeams.map((t, i) => (
                  <option key={i} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  gap: '10px',
                  marginTop: '10px',
                }}
              >
                <input
                  type="number"
                  placeholder="Points"
                  value={customPoints}
                  onChange={(e) => setCustomPoints(e.target.value)}
                  style={{ ...inputStyle, width: '48%', marginBottom: 0 }}
                />
                <input
                  type="text"
                  placeholder="Reason (Optional)"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  style={{ ...inputStyle, width: '48%', marginBottom: 0 }}
                />
              </div>
              <button
                onClick={handleAddCustomPoints}
                style={{
                  ...btnStyle,
                  backgroundColor: '#8e44ad',
                  marginTop: '10px',
                }}
              >
                Add Custom Points
              </button>
            </div>
          </div>

          <div
            style={{
              margin: '20px 0',
              paddingBottom: '20px',
              borderBottom: `1px solid ${isDarkMode ? '#444' : '#eee'}`,
            }}
          >
            <h3 style={{ color: isDarkMode ? '#ddd' : '#2c3e50' }}>
              🏆 Najmul Mahrajan (Top Scorers)
            </h3>
            <select
              value={topStudentsCat}
              onChange={(e) => {
                setTopStudentsCat(e.target.value);
                setExpandedTopStudent(null);
              }}
              style={{
                ...inputStyle,
                marginBottom: '15px',
                backgroundColor: theme.pointBg,
                border: '1px solid #27ae60',
              }}
            >
              <option value="I'dadiyya">I'dadiyya</option>
              <option value="Ibtida'iyya">Ibtida'iyya</option>
              <option value="Muthawassita">Muthawassita</option>
              <option value="Aaliya">Aaliya</option>
            </select>

            <div
              style={{
                backgroundColor: theme.inputBg,
                padding: '15px',
                borderRadius: '8px',
                border: `1px solid ${theme.inputBorder}`,
              }}
            >
              {topIndividualScorers.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#777', margin: 0 }}>
                  No scores published yet.
                </p>
              ) : (
                topIndividualScorers.map((student, index) => (
                  <div
                    key={index}
                    style={{
                      borderBottom:
                        index < topIndividualScorers.length - 1
                          ? `1px dashed ${isDarkMode ? '#555' : '#ccc'}`
                          : 'none',
                      marginBottom: '10px',
                      paddingBottom: '10px',
                    }}
                  >
                    <div
                      onClick={() =>
                        setExpandedTopStudent(
                          expandedTopStudent === student.chestNumber
                            ? null
                            : student.chestNumber
                        )
                      }
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          color: isDarkMode ? '#ddd' : '#2c3e50',
                          fontWeight: index === 0 ? 'bold' : '600',
                          fontSize: index === 0 ? '15px' : '14px',
                        }}
                      >
                        {index === 0 ? (
                          <span style={{ color: '#d35400' }}>
                            🥇 Najmul Mahrajan (1st)
                          </span>
                        ) : index === 1 ? (
                          '🥈 2nd'
                        ) : (
                          '🥉 3rd'
                        )}{' '}
                        - {student.name}
                      </span>
                      <span
                        style={{
                          fontWeight: 'bold',
                          color: '#27ae60',
                          backgroundColor: theme.pointBg,
                          padding: '4px 8px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '14px',
                        }}
                      >
                        {student.totalPoints} Pts
                        <span
                          style={{
                            fontSize: '10px',
                            color: isDarkMode ? '#4da3ff' : '#2980b9',
                          }}
                        >
                          {expandedTopStudent === student.chestNumber
                            ? '▼'
                            : '▶'}
                        </span>
                      </span>
                    </div>
                    {expandedTopStudent === student.chestNumber && (
                      <div
                        style={{
                          marginTop: '12px',
                          textAlign: 'left',
                          backgroundColor: theme.cardBg,
                          padding: '12px',
                          borderRadius: '8px',
                          border: `1px solid ${theme.cardBorder}`,
                        }}
                      >
                        <h4
                          style={{
                            margin: '0 0 8px 0',
                            color: isDarkMode ? '#4da3ff' : '#2980b9',
                            fontSize: '13px',
                          }}
                        >
                          Scored Events:
                        </h4>
                        {student.details.length === 0 ? (
                          <p style={{ fontSize: '12px', color: '#999' }}>
                            No events found.
                          </p>
                        ) : (
                          student.details.map((item, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '13px',
                                padding: '5px 0',
                                borderBottom: `1px solid ${
                                  isDarkMode ? '#444' : '#eee'
                                }`,
                              }}
                            >
                              <span>
                                {item.event}{' '}
                                {item.isGroup && (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      color: '#e67e22',
                                    }}
                                  >
                                    (Group)
                                  </span>
                                )}
                              </span>
                              <span
                                style={{
                                  fontWeight: 'bold',
                                  color: item.isGroup ? '#999' : '#27ae60',
                                }}
                              >
                                {item.isGroup ? 'Team Only' : `+${item.points}`}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            style={{
              margin: '20px 0',
              paddingBottom: '20px',
              borderBottom: `1px solid ${isDarkMode ? '#444' : '#eee'}`,
            }}
          >
            <h3 style={{ color: isDarkMode ? '#ddd' : '#2c3e50' }}>
              1. Pre-Register / Events
            </h3>
            <div
              style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}
            >
              <textarea
                rows="2"
                placeholder="Bulk Students: 101, Ali, I'dadiyya, Mihbara"
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
                style={inputStyle}
              />
              <button
                onClick={handleBulkRegister}
                style={{ ...btnStyle, backgroundColor: '#16a085' }}
              >
                Save Students
              </button>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <select
                  value={bulkEventCat}
                  onChange={(e) => setBulkEventCat(e.target.value)}
                  style={{ ...inputStyle, marginBottom: 0, width: '50%' }}
                >
                  <option value="I'dadiyya">I'dadiyya</option>
                  <option value="Ibtida'iyya">Ibtida'iyya</option>
                  <option value="Muthawassita">Muthawassita</option>
                  <option value="Aaliya">Aaliya</option>
                </select>
                <button
                  onClick={handleClearEvents}
                  style={{
                    backgroundColor: '#f39c12',
                    color: '#fff',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    width: '50%',
                  }}
                >
                  Clear Events 🧹
                </button>
              </div>
              <textarea
                rows="2"
                placeholder="Events: Qiraat, Speech, Quiz..."
                value={bulkEventsData}
                onChange={(e) => setBulkEventsData(e.target.value)}
                style={inputStyle}
              />
              <button
                onClick={handleBulkAddEvents}
                style={{ ...btnStyle, backgroundColor: '#8e44ad' }}
              >
                Save Events
              </button>
            </div>
          </div>

          {/* PUBLISHED RESULTS LIST WITH SEARCH */}
          <div
            style={{
              margin: '20px 0',
              paddingBottom: '20px',
              borderBottom: `1px solid ${isDarkMode ? '#444' : '#eee'}`,
            }}
          >
            <h3 style={{ color: isDarkMode ? '#ddd' : '#2c3e50' }}>
              📋 Published Results (Edit/Delete)
            </h3>
            <p
              style={{
                fontSize: '12px',
                color: isDarkMode ? '#aaa' : '#7f8c8d',
                marginTop: 0,
                marginBottom: '10px',
              }}
            >
              Click 'Edit' to load a saved result into the form below for
              correction.
            </p>

            <input
              type="text"
              placeholder="🔍 Search events... (eg: Qiraat)"
              value={resultSearchTerm}
              onChange={(e) => setResultSearchTerm(e.target.value)}
              style={{
                ...inputStyle,
                marginBottom: '10px',
                backgroundColor: theme.pointBg,
              }}
            />

            <div
              style={{
                maxHeight: '250px',
                overflowY: 'auto',
                backgroundColor: theme.inputBg,
                padding: '10px',
                borderRadius: '8px',
                border: `1px solid ${theme.inputBorder}`,
              }}
            >
              {filteredResults.length === 0 ? (
                <p
                  style={{
                    fontSize: '13px',
                    color: '#999',
                    textAlign: 'center',
                  }}
                >
                  No results found.
                </p>
              ) : (
                filteredResults.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px',
                      borderBottom:
                        i < filteredResults.length - 1
                          ? `1px solid ${isDarkMode ? '#444' : '#eee'}`
                          : 'none',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontWeight: 'bold',
                          color: theme.text,
                          fontSize: '14px',
                        }}
                      >
                        {r.event}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#7f8c8d',
                          marginLeft: '8px',
                        }}
                      >
                        ({r.category})
                      </span>
                      {r.resultNumber && (
                        <span
                          style={{
                            fontSize: '10px',
                            color: '#e67e22',
                            display: 'block',
                            marginTop: '3px',
                          }}
                        >
                          Result No: {r.resultNumber}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleEditClick(r)}
                      style={{
                        backgroundColor: '#3498db',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      Edit ✏️
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div id="add-result-form">
            <h3 style={{ color: isDarkMode ? '#ddd' : '#2c3e50' }}>
              2. Add / Edit Result & Points
            </h3>

            {/* EDITING INDICATOR */}
            {isEditing && (
              <div
                style={{
                  backgroundColor: '#fff3cd',
                  padding: '10px',
                  borderRadius: '8px',
                  marginBottom: '15px',
                  border: '1px solid #ffeeba',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: '#856404',
                    fontSize: '13px',
                    fontWeight: 'bold',
                  }}
                >
                  ✏️ Editing Existing Result
                </p>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    onClick={resetAddForm}
                    style={{
                      backgroundColor: '#7f8c8d',
                      color: '#fff',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteResult}
                    style={{
                      backgroundColor: '#e74c3c',
                      color: '#fff',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            )}

            <select
              value={resCat}
              onChange={(e) => {
                setResCat(e.target.value);
                if (!isEditing) setResEvent('');
              }}
              disabled={isEditing}
              style={{ ...inputStyle, marginBottom: '10px' }}
            >
              <option value="I'dadiyya">I'dadiyya</option>
              <option value="Ibtida'iyya">Ibtida'iyya</option>
              <option value="Muthawassita">Muthawassita</option>
              <option value="Aaliya">Aaliya</option>
            </select>
            <input
              list="admin-event-list"
              type="text"
              placeholder="Search & Select Event"
              value={resEvent}
              onChange={(e) => setResEvent(e.target.value)}
              disabled={isEditing || !resCat}
              style={{ ...inputStyle, marginBottom: '10px' }}
            />

            <input
              type="number"
              placeholder="Result Number (eg: 10)"
              value={resNumber}
              onChange={(e) => setResNumber(e.target.value)}
              style={{ ...inputStyle, marginBottom: '15px' }}
            />

            <div
              style={{
                backgroundColor: isDarkMode ? '#3d2b10' : '#fff3cd',
                padding: '10px',
                borderRadius: '8px',
                marginBottom: '15px',
                border: `1px solid ${isDarkMode ? '#553c15' : '#ffeeba'}`,
              }}
            >
              <label
                style={{
                  fontWeight: 'bold',
                  color: '#d35400',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={isGroupEvent}
                  onChange={(e) => setIsGroupEvent(e.target.checked)}
                  style={{ transform: 'scale(1.3)' }}
                />
                This is a Group Event
              </label>
            </div>

            <div
              style={{
                backgroundColor: isDarkMode ? '#2a1610' : '#fdf2e9',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '10px',
                border: `1px solid ${isDarkMode ? '#3d2015' : '#fae5d3'}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <h4 style={{ margin: 0, color: '#d35400' }}>🥇 1st Place</h4>
                <button
                  onClick={() => addWinnerRow(1)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#d35400',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  + Add Tie/Group
                </button>
              </div>
              {firstWinners.map((w, idx) => {
                const s = allStudents.find((st) => st.chestNumber === w.chest);
                return (
                  <div
                    key={idx}
                    style={{
                      marginBottom: '10px',
                      borderBottom:
                        idx < firstWinners.length - 1
                          ? `1px dashed ${isDarkMode ? '#663030' : '#facdcd'}`
                          : 'none',
                      paddingBottom:
                        idx < firstWinners.length - 1 ? '10px' : '0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: '5px',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Chest No"
                        value={w.chest}
                        onChange={(e) =>
                          updateWinner(1, idx, 'chest', e.target.value)
                        }
                        style={{ ...inputStyle, marginBottom: 0, width: '60%' }}
                      />
                      <input
                        type="number"
                        placeholder="Pts"
                        value={w.points}
                        onChange={(e) =>
                          updateWinner(1, idx, 'points', e.target.value)
                        }
                        style={{ ...inputStyle, marginBottom: 0, width: '25%' }}
                      />
                      {firstWinners.length > 1 && (
                        <button
                          onClick={() => removeWinnerRow(1, idx)}
                          style={{
                            width: '15%',
                            padding: '10px',
                            backgroundColor: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                          }}
                        >
                          X
                        </button>
                      )}
                    </div>
                    {w.chest.trim() !== '' && !s && (
                      <p
                        style={{
                          margin: '5px 0 0 0',
                          color: '#e74c3c',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        ❌ Chest not registered
                      </p>
                    )}
                    {w.chest.trim() !== '' && s && s.category !== resCat && (
                      <p
                        style={{
                          margin: '5px 0 0 0',
                          color: '#e67e22',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        ⚠️ Category mismatch ({s.category})
                      </p>
                    )}
                    {w.chest.trim() !== '' && s && s.category === resCat && (
                      <p
                        style={{
                          margin: '5px 0 0 0',
                          color: '#27ae60',
                          fontSize: '13px',
                          fontWeight: 'bold',
                        }}
                      >
                        ✅ {s.name} ({s.team})
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div
              style={{
                backgroundColor: isDarkMode ? '#1a2222' : '#f2f4f4',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '10px',
                border: `1px solid ${isDarkMode ? '#253535' : '#e5e8e8'}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    color: isDarkMode ? '#99a3a4' : '#7f8c8d',
                  }}
                >
                  🥈 2nd Place
                </h4>
                <button
                  onClick={() => addWinnerRow(2)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#7f8c8d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  + Add Tie/Group
                </button>
              </div>
              {secondWinners.map((w, idx) => {
                const s = allStudents.find((st) => st.chestNumber === w.chest);
                return (
                  <div
                    key={idx}
                    style={{
                      marginBottom: '10px',
                      borderBottom:
                        idx < secondWinners.length - 1
                          ? `1px dashed ${isDarkMode ? '#445' : '#bdc3c7'}`
                          : 'none',
                      paddingBottom:
                        idx < secondWinners.length - 1 ? '10px' : '0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: '5px',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Chest No"
                        value={w.chest}
                        onChange={(e) =>
                          updateWinner(2, idx, 'chest', e.target.value)
                        }
                        style={{ ...inputStyle, marginBottom: 0, width: '60%' }}
                      />
                      <input
                        type="number"
                        placeholder="Pts"
                        value={w.points}
                        onChange={(e) =>
                          updateWinner(2, idx, 'points', e.target.value)
                        }
                        style={{ ...inputStyle, marginBottom: 0, width: '25%' }}
                      />
                      {secondWinners.length > 1 && (
                        <button
                          onClick={() => removeWinnerRow(2, idx)}
                          style={{
                            width: '15%',
                            padding: '10px',
                            backgroundColor: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                          }}
                        >
                          X
                        </button>
                      )}
                    </div>
                    {w.chest.trim() !== '' && !s && (
                      <p
                        style={{
                          margin: '5px 0 0 0',
                          color: '#e74c3c',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        ❌ Chest not registered
                      </p>
                    )}
                    {w.chest.trim() !== '' && s && s.category !== resCat && (
                      <p
                        style={{
                          margin: '5px 0 0 0',
                          color: '#e67e22',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        ⚠️ Category mismatch ({s.category})
                      </p>
                    )}
                    {w.chest.trim() !== '' && s && s.category === resCat && (
                      <p
                        style={{
                          margin: '5px 0 0 0',
                          color: '#27ae60',
                          fontSize: '13px',
                          fontWeight: 'bold',
                        }}
                      >
                        ✅ {s.name} ({s.team})
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div
              style={{
                backgroundColor: theme.pointBg,
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '15px',
                border: `1px solid ${theme.pointBorder}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <h4 style={{ margin: 0, color: '#27ae60' }}>🥉 3rd Place</h4>
                <button
                  onClick={() => addWinnerRow(3)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#27ae60',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  + Add Tie/Group
                </button>
              </div>
              {thirdWinners.map((w, idx) => {
                const s = allStudents.find((st) => st.chestNumber === w.chest);
                return (
                  <div
                    key={idx}
                    style={{
                      marginBottom: '10px',
                      borderBottom:
                        idx < thirdWinners.length - 1
                          ? `1px dashed ${isDarkMode ? '#2c5a3a' : '#a9dfbf'}`
                          : 'none',
                      paddingBottom:
                        idx < thirdWinners.length - 1 ? '10px' : '0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: '5px',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Chest No"
                        value={w.chest}
                        onChange={(e) =>
                          updateWinner(3, idx, 'chest', e.target.value)
                        }
                        style={{ ...inputStyle, marginBottom: 0, width: '60%' }}
                      />
                      <input
                        type="number"
                        placeholder="Pts"
                        value={w.points}
                        onChange={(e) =>
                          updateWinner(3, idx, 'points', e.target.value)
                        }
                        style={{ ...inputStyle, marginBottom: 0, width: '25%' }}
                      />
                      {thirdWinners.length > 1 && (
                        <button
                          onClick={() => removeWinnerRow(3, idx)}
                          style={{
                            width: '15%',
                            padding: '10px',
                            backgroundColor: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                          }}
                        >
                          X
                        </button>
                      )}
                    </div>
                    {w.chest.trim() !== '' && !s && (
                      <p
                        style={{
                          margin: '5px 0 0 0',
                          color: '#e74c3c',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        ❌ Chest not registered
                      </p>
                    )}
                    {w.chest.trim() !== '' && s && s.category !== resCat && (
                      <p
                        style={{
                          margin: '5px 0 0 0',
                          color: '#e67e22',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        ⚠️ Category mismatch ({s.category})
                      </p>
                    )}
                    {w.chest.trim() !== '' && s && s.category === resCat && (
                      <p
                        style={{
                          margin: '5px 0 0 0',
                          color: '#27ae60',
                          fontSize: '13px',
                          fontWeight: 'bold',
                        }}
                      >
                        ✅ {s.name} ({s.team})
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div
              style={{
                backgroundColor: isDarkMode ? '#1f2224' : '#f4f6f7',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: `1px solid ${isDarkMode ? '#333' : '#d5dbdb'}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    color: isDarkMode ? '#6db3f2' : '#34495e',
                  }}
                >
                  🌟 Other Points (Hidden from Result)
                </h4>
                <button
                  onClick={() => addWinnerRow(4)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#34495e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  + Add Student
                </button>
              </div>

              {otherParticipants.map((w, idx) => {
                const s = allStudents.find((st) => st.chestNumber === w.chest);
                return (
                  <div key={idx} style={{ marginBottom: '10px' }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: '5px',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Chest No"
                        value={w.chest}
                        onChange={(e) =>
                          updateWinner(4, idx, 'chest', e.target.value)
                        }
                        style={{ ...inputStyle, marginBottom: 0, width: '60%' }}
                      />
                      <input
                        type="number"
                        placeholder="Pts"
                        value={w.points}
                        onChange={(e) =>
                          updateWinner(4, idx, 'points', e.target.value)
                        }
                        style={{ ...inputStyle, marginBottom: 0, width: '25%' }}
                      />
                      <button
                        onClick={() => removeWinnerRow(4, idx)}
                        style={{
                          width: '15%',
                          padding: '10px',
                          backgroundColor: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                        }}
                      >
                        X
                      </button>
                    </div>
                    {w.chest.trim() !== '' && !s && (
                      <p
                        style={{
                          margin: '5px 0 0 0',
                          color: '#e74c3c',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        ❌ Chest not registered
                      </p>
                    )}
                    {w.chest.trim() !== '' && s && s.category !== resCat && (
                      <p
                        style={{
                          margin: '5px 0 0 0',
                          color: '#e67e22',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        ⚠️ Category mismatch ({s.category})
                      </p>
                    )}
                    {w.chest.trim() !== '' && s && s.category === resCat && (
                      <p
                        style={{
                          margin: '5px 0 0 0',
                          color: '#27ae60',
                          fontSize: '13px',
                          fontWeight: 'bold',
                        }}
                      >
                        ✅ {s.name} ({s.team})
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleAddResult}
              style={{
                ...btnStyle,
                backgroundColor: isEditing ? '#27ae60' : '#c0392b',
              }}
            >
              {isEditing
                ? 'Update Result & Points ✅'
                : 'Save Result & All Points 💾'}
            </button>
          </div>
        </div>
      )}

      <div
        onClick={handleAdminLogin}
        style={{
          textAlign: 'center',
          marginTop: '50px',
          padding: '20px',
          color: '#bdc3c7',
          fontSize: '12px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        © 2026 Mahrajan Results Portal. All rights reserved. 🔒
      </div>
    </div>
  );
}
